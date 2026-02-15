'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

// Mailchimp configuration
const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY
const MAILCHIMP_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX // e.g., 'us1'
const MAILCHIMP_LIST_ID = process.env.MAILCHIMP_LIST_ID

// Helper to send email via Mailchimp
async function sendMailchimpEmail(data: {
  to: string
  subject: string
  htmlContent: string
  fromName?: string
}) {
  if (!MAILCHIMP_API_KEY || !MAILCHIMP_SERVER_PREFIX) {
    console.warn('Mailchimp not configured, skipping email send')
    return { success: false, error: 'Mailchimp not configured' }
  }

  try {
    // Create a campaign via Mailchimp API
    const campaignResponse = await fetch(
      `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/campaigns`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MAILCHIMP_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'regular',
          recipients: {
            list_id: MAILCHIMP_LIST_ID
          },
          settings: {
            subject_line: data.subject,
            from_name: data.fromName || 'Arts and Aging',
            reply_to: process.env.SUPPORT_EMAIL || 'noreply@artsandaging.com'
          }
        })
      }
    )

    if (!campaignResponse.ok) {
      const error = await campaignResponse.text()
      throw new Error(`Mailchimp campaign creation failed: ${error}`)
    }

    const campaign = await campaignResponse.json()

    // Set campaign content
    await fetch(
      `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/campaigns/${campaign.id}/content`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${MAILCHIMP_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          html: data.htmlContent
        })
      }
    )

    // Send the campaign
    await fetch(
      `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/campaigns/${campaign.id}/actions/send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MAILCHIMP_API_KEY}`
        }
      }
    )

    return {
      success: true,
      campaignId: campaign.id
    }
  } catch (error) {
    console.error('Mailchimp email error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Schedule reminders for a newly created/published event
export async function scheduleEventReminders(eventId: string) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        geriatricHome: {
          include: { user: true }
        },
        attendances: {
          where: { status: 'YES' },
          include: { user: true }
        }
      }
    })

    if (!event || event.status !== 'PUBLISHED') {
      return { error: "Event not found or not published" }
    }

    const eventDate = new Date(event.startDateTime)
    const now = new Date()

    // Calculate reminder dates
    const sevenDaysBefore = new Date(eventDate)
    sevenDaysBefore.setDate(sevenDaysBefore.getDate() - 7)

    const fiveDaysBefore = new Date(eventDate)
    fiveDaysBefore.setDate(fiveDaysBefore.getDate() - 5)

    const threeDaysBefore = new Date(eventDate)
    threeDaysBefore.setDate(threeDaysBefore.getDate() - 3)

    const oneDayBefore = new Date(eventDate)
    oneDayBefore.setDate(oneDayBefore.getDate() - 1)

    // Schedule reminders for HOME_ADMIN (5-7 days before)
    if (event.geriatricHome && sevenDaysBefore > now) {
      await prisma.emailReminder.create({
        data: {
          eventId: event.id,
          recipientType: 'HOME_ADMIN',
          recipientId: event.geriatricHome.userId,
          reminderType: '7_DAY',
          scheduledFor: sevenDaysBefore,
          status: 'PENDING',
          updatedAt: new Date()
        }
      })
    }

    if (event.geriatricHome && fiveDaysBefore > now) {
      await prisma.emailReminder.create({
        data: {
          eventId: event.id,
          recipientType: 'HOME_ADMIN',
          recipientId: event.geriatricHome.userId,
          reminderType: '5_DAY',
          scheduledFor: fiveDaysBefore,
          status: 'PENDING',
          updatedAt: new Date()
        }
      })
    }

    // Schedule reminders for STAFF (3-4 days before)
    const confirmedStaff = event.attendances.filter(a =>
      a.user.role && ['FACILITATOR', 'CONTRACTOR'].includes(a.user.role)
    )

    for (const attendance of confirmedStaff) {
      if (threeDaysBefore > now) {
        await prisma.emailReminder.create({
          data: {
            eventId: event.id,
            recipientType: 'STAFF',
            recipientId: attendance.userId,
            reminderType: '3_DAY',
            scheduledFor: threeDaysBefore,
            status: 'PENDING'
          }
        })
      }

      if (oneDayBefore > now) {
        await prisma.emailReminder.create({
          data: {
            eventId: event.id,
            recipientType: 'STAFF',
            recipientId: attendance.userId,
            reminderType: '1_DAY',
            scheduledFor: oneDayBefore,
            status: 'PENDING'
          }
        })
      }
    }

    return { success: true, message: 'Reminders scheduled' }
  } catch (error) {
    console.error('Schedule reminders error:', error)
    return { error: "Failed to schedule reminders" }
  }
}

// Process pending reminders (should be called by a cron job)
export async function processPendingReminders() {
  const session = await auth()
  // Only admins or system should be able to trigger this
  if (session?.user?.role !== 'ADMIN' && !process.env.CRON_SECRET) {
    return { error: "Unauthorized" }
  }

  try {
    const now = new Date()

    // Get all pending reminders that are due
    const dueReminders = await prisma.emailReminder.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: {
          lte: now
        }
      },
      include: {
        event: {
          include: {
            location: true,
            geriatricHome: true
          }
        }
      },
      take: 50 // Process in batches
    })

    const results = {
      processed: 0,
      sent: 0,
      failed: 0
    }

    for (const reminder of dueReminders) {
      results.processed++

      try {
        // Get recipient info
        const recipient = reminder.recipientId
          ? await prisma.user.findUnique({
              where: { id: reminder.recipientId },
              select: { email: true, name: true, preferredName: true }
            })
          : null

        if (!recipient || !recipient.email) {
          await prisma.emailReminder.update({
            where: { id: reminder.id },
            data: {
              status: 'FAILED',
              error: 'Recipient not found or no email'
            }
          })
          results.failed++
          continue
        }

        // Generate email content based on reminder type and recipient type
        const emailContent = generateReminderEmail({
          reminder,
          recipient,
          event: reminder.event
        })

        // Send via Mailchimp
        const sendResult = await sendMailchimpEmail({
          to: recipient.email,
          subject: emailContent.subject,
          htmlContent: emailContent.html
        })

        if (sendResult.success) {
          await prisma.emailReminder.update({
            where: { id: reminder.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
              mailchimpCampaignId: sendResult.campaignId,
              mailchimpStatus: 'sent'
            }
          })
          results.sent++
        } else {
          await prisma.emailReminder.update({
            where: { id: reminder.id },
            data: {
              status: 'FAILED',
              error: sendResult.error
            }
          })
          results.failed++
        }
      } catch (error) {
        console.error(`Failed to process reminder ${reminder.id}:`, error)
        await prisma.emailReminder.update({
          where: { id: reminder.id },
          data: {
            status: 'FAILED',
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        })
        results.failed++
      }
    }

    return {
      success: true,
      results
    }
  } catch (error) {
    console.error('Process reminders error:', error)
    return { error: "Failed to process reminders" }
  }
}

// Generate email content
function generateReminderEmail(data: {
  reminder: any
  recipient: { name: string | null, preferredName: string | null, email: string }
  event: any
}) {
  const { reminder, recipient, event } = data
  const recipientName = recipient.preferredName || recipient.name || 'there'
  const eventDate = new Date(event.startDateTime)
  const eventTime = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const eventDateStr = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  let daysUntil = 0
  if (reminder.reminderType === '7_DAY') daysUntil = 7
  else if (reminder.reminderType === '5_DAY') daysUntil = 5
  else if (reminder.reminderType === '3_DAY') daysUntil = 3
  else if (reminder.reminderType === '1_DAY') daysUntil = 1

  const isHomeAdmin = reminder.recipientType === 'HOME_ADMIN'

  const subject = isHomeAdmin
    ? `Reminder: ${event.title} is ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'} away`
    : `Event Reminder: ${event.title} - ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'} away`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .event-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { margin: 10px 0; }
    .label { font-weight: bold; color: #555; }
    .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${isHomeAdmin ? '📅 Event Reminder' : '🎭 You Have an Event Coming Up!'}</h1>
    </div>
    <div class="content">
      <p>Hi ${recipientName},</p>

      <p>${isHomeAdmin
        ? `This is a friendly reminder that your event is coming up in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}!`
        : `Don't forget! You're scheduled to facilitate an event in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}.`
      }</p>

      <div class="event-details">
        <h2>${event.title}</h2>

        <div class="detail-row">
          <span class="label">📅 Date:</span> ${eventDateStr}
        </div>

        <div class="detail-row">
          <span class="label">🕐 Time:</span> ${eventTime}
        </div>

        ${event.location ? `
        <div class="detail-row">
          <span class="label">📍 Location:</span> ${event.location.name}
          <br><span style="margin-left: 20px; color: #666;">${event.location.address}</span>
        </div>
        ` : ''}

        ${event.geriatricHome && !isHomeAdmin ? `
        <div class="detail-row">
          <span class="label">🏠 Facility:</span> ${event.geriatricHome.name}
        </div>
        ` : ''}

        ${event.description ? `
        <div class="detail-row" style="margin-top: 15px;">
          <span class="label">📝 Description:</span>
          <p style="margin: 5px 0 0 20px; color: #666;">${event.description}</p>
        </div>
        ` : ''}
      </div>

      ${isHomeAdmin ? `
        <p>Please ensure:</p>
        <ul>
          <li>✅ Your facility is prepared for the event</li>
          <li>✅ Residents who plan to attend are informed</li>
          <li>✅ Any special accommodations are ready</li>
        </ul>
      ` : `
        <p>Please remember to:</p>
        <ul>
          <li>✅ Review any facility-specific notes in the app</li>
          <li>✅ Check-in when you arrive (24 hours before event)</li>
          <li>✅ Bring any necessary materials</li>
        </ul>
      `}

      <div style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/events/${event.id}" class="button">
          View Event Details
        </a>
      </div>

      <p>If you have any questions or need to make changes, please contact us as soon as possible.</p>

      <p>Thank you!<br>Arts and Aging Team</p>
    </div>

    <div class="footer">
      <p>This is an automated reminder. Please do not reply to this email.</p>
      <p>Arts and Aging | ${process.env.SUPPORT_EMAIL || 'info@artsandaging.com'}</p>
    </div>
  </div>
</body>
</html>
  `

  return { subject, html }
}

// Cancel reminders for an event (if event is cancelled)
export async function cancelEventReminders(eventId: string) {
  try {
    await prisma.emailReminder.updateMany({
      where: {
        eventId,
        status: 'PENDING'
      },
      data: {
        status: 'CANCELLED'
      }
    })

    return { success: true }
  } catch (error) {
    console.error('Cancel reminders error:', error)
    return { error: "Failed to cancel reminders" }
  }
}

// Get reminder status for an event (admin view)
export async function getEventReminderStatus(eventId: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: "Unauthorized" }
  }

  try {
    const reminders = await prisma.emailReminder.findMany({
      where: { eventId },
      include: {
        event: {
          select: {
            title: true,
            startDateTime: true
          }
        }
      },
      orderBy: { scheduledFor: 'asc' }
    })

    const stats = {
      total: reminders.length,
      pending: reminders.filter(r => r.status === 'PENDING').length,
      sent: reminders.filter(r => r.status === 'SENT').length,
      failed: reminders.filter(r => r.status === 'FAILED').length,
      cancelled: reminders.filter(r => r.status === 'CANCELLED').length
    }

    return {
      success: true,
      data: { reminders, stats }
    }
  } catch (error) {
    console.error('Get reminder status error:', error)
    return { error: "Failed to get reminder status" }
  }
}
