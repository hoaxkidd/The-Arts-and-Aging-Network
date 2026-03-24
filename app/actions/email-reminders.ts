'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { formatEventTime, formatEventDateRange, generateCalendarLinks } from "@/lib/email/calendar"
import { logger } from "@/lib/logger"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://artsandaging.com'
const FROM_EMAIL = process.env.MAILCHIMP_FROM_EMAIL || 'noreply@artsandaging.com'
const FROM_NAME = process.env.MAILCHIMP_FROM_NAME || 'Arts and Aging'
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@artsandaging.com'

// Send email via Mandrill Transactional
async function sendEmail(to: string, subject: string, html: string) {
  const API_KEY = process.env.MAILCHIMP_TRANSACTIONAL_API_KEY
  if (!API_KEY) {
    logger.error('Mandrill API key not configured')
    return { success: false, error: 'API key not configured' }
  }

  try {
    const response = await fetch('https://mandrillapp.com/api/1.0/messages/send.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: API_KEY,
        message: {
          from_email: FROM_EMAIL,
          from_name: FROM_NAME,
          to: [{ email: to, type: 'to' }],
          subject,
          html,
        }
      })
    })

    const data = await response.json() as Array<{ status?: string; _id?: string; reject_reason?: string }>
    const first = Array.isArray(data) ? data[0] : null
    
    if (!first || (first.status !== 'sent' && first.status !== 'queued')) {
      return { success: false, error: first?.reject_reason || 'Unknown error' }
    }

    return { success: true, messageId: first._id }
  } catch (error) {
    logger.error('Failed to send email:', error)
    return { success: false, error: `Failed to send: ${error}` }
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

    // Get reminder days from event, default to 5 for home admin and 3 for staff
    const homeAdminReminderDays = event.homeAdminReminderDays || 5
    const staffReminderDays = event.staffReminderDays || 3

    // Calculate reminder dates
    const homeAdminReminderDate = new Date(eventDate)
    homeAdminReminderDate.setDate(homeAdminReminderDate.getDate() - homeAdminReminderDays)

    const staffReminderDate = new Date(eventDate)
    staffReminderDate.setDate(staffReminderDate.getDate() - staffReminderDays)

    // Schedule reminder for HOME_ADMIN
    if (event.geriatricHome && homeAdminReminderDate > now) {
      await prisma.emailReminder.upsert({
        where: {
          eventId_recipientType_recipientId_reminderType: {
            eventId: event.id,
            recipientType: 'HOME_ADMIN',
            recipientId: event.geriatricHome.userId,
            reminderType: 'HOME_ADMIN_REMINDER',
          },
        },
        update: {
          scheduledFor: homeAdminReminderDate,
          status: 'PENDING',
          error: null,
        },
        create: {
          eventId: event.id,
          recipientType: 'HOME_ADMIN',
          recipientId: event.geriatricHome.userId,
          reminderType: 'HOME_ADMIN_REMINDER',
          scheduledFor: homeAdminReminderDate,
          status: 'PENDING',
        }
      })
    }

    // Schedule reminder for STAFF (using dynamic days from event)
    const confirmedStaff = event.attendances.filter(a =>
      a.user.role && ['FACILITATOR'].includes(a.user.role)
    )

    for (const attendance of confirmedStaff) {
      if (staffReminderDate > now) {
        await prisma.emailReminder.upsert({
          where: {
            eventId_recipientType_recipientId_reminderType: {
              eventId: event.id,
              recipientType: 'STAFF',
              recipientId: attendance.userId,
              reminderType: 'STAFF_REMINDER',
            },
          },
          update: {
            scheduledFor: staffReminderDate,
            status: 'PENDING',
            error: null,
          },
          create: {
            eventId: event.id,
            recipientType: 'STAFF',
            recipientId: attendance.userId,
            reminderType: 'STAFF_REMINDER',
            scheduledFor: staffReminderDate,
            status: 'PENDING',
          }
        })
      }
    }

    return { success: true, message: 'Reminders scheduled' }
  } catch (error) {
    logger.error('Schedule reminders error:', error)
    return { error: "Failed to schedule reminders" }
  }
}

// Process pending reminders (should be called by a cron job)
export async function processPendingReminders(options?: { trustedCron?: boolean }) {
  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN'
  if (!isAdmin && !options?.trustedCron) {
    return { error: "Unauthorized" }
  }

  try {
    const now = new Date()

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
      take: 50
    })

    const results = {
      processed: 0,
      sent: 0,
      failed: 0
    }

    for (const reminder of dueReminders) {
      results.processed++

      try {
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

        const emailContent = generateReminderEmail({
          reminder,
          recipient,
          event: reminder.event
        })

        const sendResult = await sendEmail(
          recipient.email,
          emailContent.subject,
          emailContent.html
        )

        if (sendResult.success) {
          await prisma.emailReminder.update({
            where: { id: reminder.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
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
        logger.error(`Failed to process reminder ${reminder.id}:`, error)
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
    logger.error('Process reminders error:', error)
    return { error: "Failed to process reminders" }
  }
}

interface ReminderData {
  reminder: { id: string; eventId: string; recipientType: string; reminderType: string; scheduledFor: Date }
  recipient: { name: string | null; preferredName: string | null; email: string | null }
  event: { 
    id: string; 
    title: string; 
    description: string | null;
    reminderMessage: string | null;
    startDateTime: Date; 
    endDateTime: Date; 
    location: { name: string; address: string } | null; 
    geriatricHome: { name: string } | null 
  }
}

function generateReminderEmail(data: ReminderData) {
  const { reminder, recipient, event } = data
  const recipientName = recipient.preferredName || recipient.name || 'there'
  
  const startDateTime = new Date(event.startDateTime)
  const endDateTime = new Date(event.endDateTime)
  const eventTime = formatEventTime(startDateTime, endDateTime)
  const eventDateStr = formatEventDateRange(startDateTime, endDateTime)

  const isHomeAdmin = reminder.recipientType === 'HOME_ADMIN'
  
  // Calculate days until event
  const now = new Date()
  const eventDate = new Date(event.startDateTime)
  const diffTime = eventDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  const daysUntil = diffDays > 0 ? diffDays : 0

  const subject = isHomeAdmin
    ? `Reminder: ${event.title} - ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'} away`
    : `Event Reminder: ${event.title} - ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'} away`

  const calendarLinks = generateCalendarLinks({
    title: event.title,
    description: event.description || '',
    startDateTime,
    endDateTime,
    location: event.location?.address,
    url: `${APP_URL}/events/${event.id}`
  })

  const googleMapsUrl = event.location?.address 
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location.address)}`
    : ''

  // Use admin's custom message if provided, otherwise use default
  const reminderText = event.reminderMessage 
    ? event.reminderMessage 
    : (isHomeAdmin 
      ? `This is a friendly reminder that your event is coming up in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}!`
      : `Don't forget! You're scheduled to facilitate an event in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}.`)

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Reminder</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">&#128336; Event Reminder</h1>
  </div>
  
  <div style="background: #ffffff; padding: 35px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin: 0 0 20px; color: #111827; font-size: 16px;">Hi ${recipientName},</p>
    
    <p style="margin: 0 0 25px; color: #374151; font-size: 16px;">
      ${reminderText}
    </p>
    
    <div style="background: #f9fafb; padding: 20px; border-radius: 10px; margin: 0 0 25px; border-left: 4px solid #F59E0B;">
      <h2 style="margin: 0 0 15px; color: #111827; font-size: 18px;">${event.title}</h2>
      <p style="margin: 0 0 10px; color: #111827; font-size: 15px;"><strong>&#128197; Date:</strong> ${eventDateStr}</p>
      <p style="margin: 0 0 10px; color: #111827; font-size: 15px;"><strong>&#128337; Time:</strong> ${eventTime}</p>
      ${event.location ? `<p style="margin: 0; color: #111827; font-size: 15px;"><strong>&#128205; Location:</strong> <a href="${googleMapsUrl}" target="_blank" rel="noopener" style="color: #4F46E5; text-decoration: underline;">${event.location.name}</a></p>` : ''}
    </div>
    
    ${isHomeAdmin ? `
    <p style="margin: 0 0 15px; color: #374151; font-size: 15px;">Please ensure:</p>
    <ul style="margin: 0 0 20px; padding-left: 20px; color: #374151; font-size: 15px;">
      <li>&#10003; Your facility is prepared for the event</li>
      <li>&#10003; Residents who plan to attend are informed</li>
      <li>&#10003; Any special accommodations are ready</li>
    </ul>
    ` : `
    <p style="margin: 0 0 15px; color: #374151; font-size: 15px;">Please remember to:</p>
    <ul style="margin: 0 0 20px; padding-left: 20px; color: #374151; font-size: 15px;">
      <li>&#10003; Review any facility-specific notes in the app</li>
      <li>&#10003; Check-in when you arrive (24 hours before event)</li>
      <li>&#10003; Bring any necessary materials</li>
    </ul>
    `}
    
    <div style="text-align: center; margin: 0 0 30px;">
      <a href="${APP_URL}/events/${event.id}" style="display: inline-block; background: #4F46E5; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; font-family: Arial, sans-serif;">
        View Event Details
      </a>
    </div>
    
    <div style="margin: 25px 0; padding: 20px; background: #f9fafb; border-radius: 12px;">
      <h3 style="color: #111827; margin: 0 0 15px; text-align: center; font-size: 18px; font-family: Arial, sans-serif;">Add to Your Calendar</h3>
      
      <div style="text-align: center; margin: 0 0 15px;">
        <a href="${calendarLinks.google}" target="_blank" rel="noopener" style="display: inline-block; background: #4285f4; color: white; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: 500; margin: 5px; font-size: 14px; font-family: Arial, sans-serif;">Google Calendar</a>
        <a href="${calendarLinks.outlook}" target="_blank" rel="noopener" style="display: inline-block; background: #0078d4; color: white; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: 500; margin: 5px; font-size: 14px; font-family: Arial, sans-serif;">Outlook</a>
        <a href="${calendarLinks.office365}" target="_blank" rel="noopener" style="display: inline-block; background: #0078d4; color: white; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: 500; margin: 5px; font-size: 14px; font-family: Arial, sans-serif;">Office 365</a>
        <a href="${calendarLinks.yahoo}" target="_blank" rel="noopener" style="display: inline-block; background: #6001d2; color: white; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: 500; margin: 5px; font-size: 14px; font-family: Arial, sans-serif;">Yahoo</a>
        <a href="${calendarLinks.webcal}" download="event.ics" style="display: inline-block; background: #6b7280; color: white; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: 500; margin: 5px; font-size: 14px; font-family: Arial, sans-serif;">Apple Calendar</a>
      </div>
      
      <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center; font-family: Arial, sans-serif;">
        Click a button above to add this event to your calendar
      </p>
    </div>
    
    <p style="margin: 20px 0 0; color: #9ca3af; font-size: 13px; text-align: center; font-family: Arial, sans-serif;">
      If you have any questions or need to make changes, please contact us as soon as possible.
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0; font-family: Arial, sans-serif;">${APP_URL.replace('https://', '')} | ${SUPPORT_EMAIL}</p>
    <p style="margin: 5px 0 0; font-family: Arial, sans-serif;">This is an automated reminder. Please do not reply to this email.</p>
  </div>
</body>
</html>`

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
    logger.error('Cancel reminders error:', error)
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
    logger.error('Get reminder status error:', error)
    return { error: "Failed to get reminder status" }
  }
}
