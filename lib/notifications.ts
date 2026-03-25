import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { logger } from "@/lib/logger"
import { sendEmail, sendEmailWithCustomContent } from "@/lib/email/service"

type NotificationType =
  | 'EVENT_CREATED'
  | 'EVENT_UPDATED'
  | 'EVENT_CANCELLED'
  | 'RSVP_RECEIVED'
  | 'STAFF_CHECKIN'
  | 'EXPENSE_SUBMITTED'
  | 'EXPENSE_APPROVED'
  | 'EXPENSE_REJECTED'
  | 'DIRECT_MESSAGE'
  | 'GROUP_MESSAGE'
  | 'GROUP_ACCESS_REQUEST'
  | 'GROUP_ACCESS_APPROVED'
  | 'GROUP_ACCESS_DENIED'
  | 'GROUP_ADDED'
  | 'GROUP_REMOVED'
  | 'GROUP_MEMBER_LEFT'
  | 'TIMESHEET_SUBMITTED'
  | 'TIMESHEET_APPROVED'
  | 'TIMESHEET_REJECTED'
  | 'MILEAGE_APPROVED'
  | 'MILEAGE_REJECTED'
  | 'PHONE_REQUEST'
  | 'PHONE_REQUEST_RESPONSE'
  | 'MEETING_REQUEST'
  | 'MEETING_REQUEST_RESPONSE'
  | 'COMMENT_REPLY'
  | 'GENERAL'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
}

interface UserPreferences {
  email: boolean
  sms: boolean
  inApp: boolean
}

// Helper to parse preferences
function parsePreferences(prefsString: string | null): UserPreferences {
  if (!prefsString) return { email: true, sms: false, inApp: true } // Defaults
  try {
    return JSON.parse(prefsString)
  } catch {
    return { email: true, sms: false, inApp: true }
  }
}

// Create a single notification
export async function createNotification(params: CreateNotificationParams) {
  // Check user preferences
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { notificationPreferences: true, email: true, phone: true, name: true }
  })

  const prefs = parsePreferences(user?.notificationPreferences || null)

  // In-App Notification
  if (prefs.inApp) {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
      }
    })
  }

  // Email Notification
  if (prefs.email && user?.email) {
    await sendEventNotificationEmail({
      to: user.email,
      name: user.name || 'User',
      subject: params.title,
      content: params.message,
      link: params.link || ''
    })
  }

  // SMS Notification
  if (prefs.sms && user?.phone) {
    await sendSMS({
      to: user.phone,
      message: `${params.title}: ${params.message}`
    })
  }

  return { success: true }
}

// Notify all staff members about a new event
export async function notifyAllStaffAboutEvent(event: {
  id: string
  title: string
  startDateTime: Date
  location: { name: string }
}) {
  // Get all PAYROLL and ADMIN users (relaxed status check)
  const staffMembers = await prisma.user.findMany({
    where: {
      role: { in: ['PAYROLL', 'ADMIN'] }
    },
    select: { id: true, email: true, name: true, phone: true, notificationPreferences: true }
  })

  logger.log(`Found ${staffMembers.length} users to notify about new event`)
  
  // Debug: Log each user's notification preferences
  for (const staff of staffMembers) {
    const prefs = parsePreferences(staff.notificationPreferences)
    logger.log(`User ${staff.email}: inApp=${prefs.inApp}, email=${prefs.email}, sms=${prefs.sms}, phone=${staff.phone}`)
  }

  const formattedDate = event.startDateTime.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  const title = 'New Event Available'
  const message = `"${event.title}" has been scheduled for ${formattedDate} at ${event.location.name}. RSVP now!`
  const link = `/events/${event.id}`

  // Batch process notifications based on preferences
  const inAppNotifications = []
  
  for (const staff of staffMembers) {
    const prefs = parsePreferences(staff.notificationPreferences)

    if (prefs.inApp) {
      inAppNotifications.push({
        userId: staff.id,
        type: 'EVENT_CREATED' as NotificationType,
        title,
        message,
        link,
        read: false,
        emailSent: prefs.email, // Tracking flag
      })
    }
  }

  if (inAppNotifications.length > 0) {
    await prisma.notification.createMany({
      data: inAppNotifications
    })
    logger.log(`Created ${inAppNotifications.length} in-app notifications`)
  }

  // Send emails/SMS (non-blocking)
  // We use Promise.allSettled to ensure one failure doesn't stop others
  const notificationPromises = []

  const appUrl = process.env.NEXTAUTH_URL || 'https://artsandaging.com'
  const eventLink = `${appUrl}/events/${event.id}`
  const formattedTime = event.startDateTime.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  for (const staff of staffMembers) {
    const prefs = parsePreferences(staff.notificationPreferences)
    
    if (prefs.email && staff.email) {
      notificationPromises.push(
        sendEmail({
          to: staff.email,
          templateType: 'EVENT_CREATED',
          variables: {
            name: staff.name || 'Staff Member',
            eventTitle: event.title,
            eventDate: formattedDate,
            eventTime: formattedTime,
            eventLocation: event.location.name,
            eventLink: eventLink,
            googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location.name)}`,
          }
        }).catch(e => logger.error(`Failed to email ${staff.email}`, e))
      )
    }

    if (prefs.sms && staff.phone) {
      notificationPromises.push(
        sendSMS({
          to: staff.phone,
          message: `${title}: ${message}`
        }).catch(e => logger.error(`Failed to sms ${staff.phone}`, e))
      )
    }
  }

  // Don't await this if you want it to be truly background, but for now we await to ensure logs appear
  await Promise.allSettled(notificationPromises)

  return { notifiedCount: staffMembers.length }
}

// Notify staff members (ADMIN/PAYROLL) about event updates
export async function notifyAllStaffAboutEventUpdate(event: {
  id: string
  title: string
  startDateTime: Date
  location?: string
  changes: string[]
}) {
  const staffMembers = await prisma.user.findMany({
    where: { role: { in: ['PAYROLL', 'ADMIN'] } },
    select: { id: true, email: true, name: true, phone: true, notificationPreferences: true }
  })

  logger.log(`Found ${staffMembers.length} staff to notify about event update`)

  const formattedDate = event.startDateTime.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  })
  
  const title = 'Event Updated'
  const message = `"${event.title}" on ${formattedDate} - Event details have been updated.`
  const link = `/events/${event.id}`

  // Format changes for email
  const changesHtml = event.changes.length > 0 
    ? event.changes.map(c => `<li style="margin-bottom: 4px;">• ${c}</li>`).join('')
    : '<li>General update</li>'

  const inAppNotifications = []
  for (const staff of staffMembers) {
    const prefs = parsePreferences(staff.notificationPreferences)
    if (prefs.inApp) {
      inAppNotifications.push({
        userId: staff.id,
        type: 'EVENT_UPDATED' as NotificationType,
        title,
        message,
        link,
        read: false,
      })
    }
  }

  if (inAppNotifications.length > 0) {
    await prisma.notification.createMany({ data: inAppNotifications })
  }

  const notificationPromises = []

  const appUrl = process.env.NEXTAUTH_URL || 'https://artsandaging.com'
  const eventLink = `${appUrl}/events/${event.id}`
  const formattedTime = event.startDateTime.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  for (const staff of staffMembers) {
    const prefs = parsePreferences(staff.notificationPreferences)
    if (prefs.email && staff.email) {
      notificationPromises.push(
        sendEmail({
          to: staff.email,
          templateType: 'EVENT_UPDATED',
          variables: {
            name: staff.name || 'Staff Member',
            eventTitle: event.title,
            eventDate: formattedDate,
            eventTime: formattedTime,
            eventLocation: event.location || '',
            eventLink: eventLink,
            googleMapsUrl: event.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}` : '',
            eventChanges: changesHtml,
          }
        }).catch(e => logger.error(`Failed to email ${staff.email}`, e))
      )
    }
  }

  await Promise.allSettled(notificationPromises)
  return { notifiedCount: staffMembers.length }
}

// Notify volunteers who have signed up for past events about new events
export async function notifyEventSignupsAboutNewEvent(event: {
  id: string
  title: string
  startDateTime: Date
  location: { name: string }
}) {
  // Get approved volunteers
  const volunteers = await prisma.user.findMany({
    where: {
      role: 'VOLUNTEER',
      volunteerReviewStatus: 'APPROVED',
    },
    select: { id: true, email: true, name: true, phone: true, notificationPreferences: true }
  })

  // Also get users who have attended any event
  const attendeeUserIds = await prisma.eventAttendance.findMany({
    where: { status: 'YES' },
    select: { userId: true },
    distinct: ['userId']
  })
  
  const attendeeIds = attendeeUserIds.map(a => a.userId)
  
  // Combine: volunteers who are approved OR have attended events
  const allUserIds = [...new Set([...volunteers.map(u => u.id), ...attendeeIds])]
  
  if (allUserIds.length === 0) {
    logger.log('No event signups to notify')
    return { notifiedCount: 0 }
  }

  const usersToNotify = await prisma.user.findMany({
    where: { id: { in: allUserIds } },
    select: { id: true, email: true, name: true, notificationPreferences: true }
  })

  logger.log(`Found ${usersToNotify.length} users to notify about new event`)

  // Build notification content
  const formattedDate = event.startDateTime.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  })
  
  const title = 'New Event Available'
  const message = `"${event.title}" has been scheduled for ${formattedDate} at ${event.location.name}. RSVP now!`
  const link = `/events/${event.id}`

  // Create in-app notifications
  const notifications = []
  for (const user of usersToNotify) {
    const prefs = parsePreferences(user.notificationPreferences)
    if (prefs.inApp) {
      notifications.push({
        userId: user.id,
        type: 'EVENT_CREATED' as NotificationType,
        title,
        message,
        link,
        read: false,
      })
    }
  }

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications })
  }

  // Send emails
  const emailPromises = []
  const appUrl = process.env.NEXTAUTH_URL || 'https://artsandaging.com'
  const eventLink = `${appUrl}/volunteers/events/${event.id}`
  const formattedTime = event.startDateTime.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  for (const user of usersToNotify) {
    const prefs = parsePreferences(user.notificationPreferences)
    if (prefs.email && user.email) {
      emailPromises.push(
        sendEmail({
          to: user.email,
          templateType: 'EVENT_CREATED',
          variables: {
            name: user.name || 'Volunteer',
            eventTitle: event.title,
            eventDate: formattedDate,
            eventTime: formattedTime,
            eventLocation: event.location.name,
            eventLink: eventLink,
            googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location.name)}`,
          }
        }).catch(e => logger.error(`Failed to email ${user.email}`, e))
      )
    }
  }

  await Promise.allSettled(emailPromises)
  return { notifiedCount: usersToNotify.length }
}

// Notify volunteers about event updates
export async function notifyEventSignupsAboutEventUpdate(event: {
  id: string
  title: string
  startDateTime: Date
  location?: string
  changes: string[]
}) {
  // Get approved volunteers
  const volunteers = await prisma.user.findMany({
    where: {
      role: 'VOLUNTEER',
      volunteerReviewStatus: 'APPROVED',
    },
    select: { id: true, email: true, name: true, phone: true, notificationPreferences: true }
  })

  // Also get users who have attended any event
  const attendeeUserIds = await prisma.eventAttendance.findMany({
    where: { status: 'YES' },
    select: { userId: true },
    distinct: ['userId']
  })
  
  const attendeeIds = attendeeUserIds.map(a => a.userId)
  
  // Combine: volunteers who are approved OR have attended events
  const allUserIds = [...new Set([...volunteers.map(u => u.id), ...attendeeIds])]
  
  if (allUserIds.length === 0) {
    logger.log('No event signups to notify about update')
    return { notifiedCount: 0 }
  }

  const usersToNotify = await prisma.user.findMany({
    where: { id: { in: allUserIds } },
    select: { id: true, email: true, name: true, notificationPreferences: true }
  })

  logger.log(`Found ${usersToNotify.length} users to notify about event update`)

  // Build notification content
  const formattedDate = event.startDateTime.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  })
  
  const title = 'Event Updated'
  const message = `"${event.title}" on ${formattedDate} has been updated.`
  const link = `/events/${event.id}`

  // Format changes for email
  const changesHtml = event.changes.length > 0 
    ? event.changes.map(c => `<li style="margin-bottom: 4px;">• ${c}</li>`).join('')
    : '<li>General update</li>'

  // Create in-app notifications
  const notifications = []
  for (const user of usersToNotify) {
    const prefs = parsePreferences(user.notificationPreferences)
    if (prefs.inApp) {
      notifications.push({
        userId: user.id,
        type: 'EVENT_UPDATED' as NotificationType,
        title,
        message,
        link,
        read: false,
      })
    }
  }

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications })
  }

  // Send emails
  const emailPromises = []
  const appUrl = process.env.NEXTAUTH_URL || 'https://artsandaging.com'
  const eventLink = `${appUrl}/volunteers/events/${event.id}`
  const formattedTime = event.startDateTime.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  for (const user of usersToNotify) {
    const prefs = parsePreferences(user.notificationPreferences)
    if (prefs.email && user.email) {
      emailPromises.push(
        sendEmail({
          to: user.email,
          templateType: 'EVENT_UPDATED',
          variables: {
            name: user.name || 'Volunteer',
            eventTitle: event.title,
            eventDate: formattedDate,
            eventTime: formattedTime,
            eventLocation: event.location || '',
            eventLink: eventLink,
            googleMapsUrl: event.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}` : '',
            eventChanges: changesHtml,
          }
        }).catch(e => logger.error(`Failed to email ${user.email}`, e))
      )
    }
  }

  await Promise.allSettled(emailPromises)
  return { notifiedCount: usersToNotify.length }
}

// Notify all staff members about an event CANCELLATION
export async function notifyAllStaffAboutEventCancellation(event: {
    title: string
    date: Date
}) {
  

    const staffMembers = await prisma.user.findMany({
      where: { role: { in: ['PAYROLL', 'ADMIN'] } },
      select: { id: true, email: true, name: true, phone: true, notificationPreferences: true }
    })
  
    logger.log(`Found ${staffMembers.length} users to notify`)

    const formattedDate = event.date.toLocaleDateString()
    const title = 'Event Cancelled'
    const message = `The event "${event.title}" scheduled for ${formattedDate} has been cancelled.`
  
    const inAppNotifications = []
  
    for (const staff of staffMembers) {
      const prefs = parsePreferences(staff.notificationPreferences)
  
      if (prefs.inApp) {
        inAppNotifications.push({
          userId: staff.id,
          type: 'EVENT_CANCELLED' as NotificationType,
          title,
          message,
          link: null, // No link for deleted event
          read: false,
        })
      }
    }
  
    if (inAppNotifications.length > 0) {
      await prisma.notification.createMany({ data: inAppNotifications })
      logger.log(`Created ${inAppNotifications.length} in-app notifications`)
    }

    // Send emails/SMS (non-blocking)
    const notificationPromises = []

    for (const staff of staffMembers) {
      const prefs = parsePreferences(staff.notificationPreferences)
      
      if (prefs.email && staff.email) {
        notificationPromises.push(
            sendEventNotificationEmail({
            to: staff.email,
            name: staff.name || 'Staff Member',
            subject: title,
            content: message,
            link: ''
            }).catch(e => logger.error(`Failed to email ${staff.email}`, e))
        )
      }

      if (prefs.sms && staff.phone) {
        notificationPromises.push(
            sendSMS({
            to: staff.phone,
            message: `${title}: ${message}`
            }).catch(e => logger.error(`Failed to sms ${staff.phone}`, e))
        )
      }
    }

    await Promise.allSettled(notificationPromises)
}

// SMS sending function (placeholder)
async function sendSMS(params: { to: string, message: string }) {
    logger.log(`
📱 SMS NOTIFICATION
To: ${params.to}
Message: ${params.message}
    `)
    return true
}

// Email sending function - uses Mailchimp via email service
async function sendEventNotificationEmail(params: {
  to: string
  name: string
  subject: string
  content: string
  link: string
  eventTitle?: string
  eventDate?: string
  eventLocation?: string
  eventLink?: string
}) {
  // Compatibility with old calls
  const subject = params.subject || `New Event: ${params.eventTitle}`
  const content = params.content || `A new event has been scheduled: ${params.eventTitle}`
  const link = params.link || params.eventLink || ''
  const appUrl = process.env.NEXTAUTH_URL || 'https://the-arts-and-aging-network.vercel.app'

  logger.log(`📧 Attempting to send email to: ${params.to}`)

  // Create HTML content
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">${subject}</h2>
      <p>Hi ${params.name},</p>
      <p style="color: #555;">${content}</p>
      ${link ? `<p><a href="${appUrl}${link}" style="color: #0066cc;">Click here to view details</a></p>` : ''}
      <hr style="border: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">
        This is an automated notification from The Arts and Aging Network.
      </p>
    </div>
  `

  try {
    const result = await sendEmailWithCustomContent(
      params.to,
      subject,
      htmlContent
    )
    
    if (result.success) {
      logger.log(`✅ Email sent successfully to ${params.to}, messageId: ${result.messageId}`)
      return { success: true, messageId: result.messageId }
    } else {
      logger.error(`❌ Failed to send email to ${params.to}: ${result.error}`)
      return { success: false, error: result.error }
    }
  } catch (error) {
    logger.error(`❌ Exception sending email to ${params.to}:`, error)
    return { success: false, error: String(error) }
  }
}

// Get unread notification count for a user
export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: { userId, read: false }
  })
}

// Get notifications for a user
export async function getUserNotifications(userId: string, limit = 20) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit
  })
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true }
  })
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true }
  })
}

// ============================================
// ADMIN NOTIFICATIONS
// ============================================

// Notify all admins about staff RSVP
export async function notifyAdminsAboutRSVP(params: {
  staffName: string
  staffId: string
  eventId: string
  eventTitle: string
  rsvpStatus: string
}) {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', status: 'ACTIVE' },
    select: { id: true, notificationPreferences: true }
  })

  const statusText = params.rsvpStatus === 'YES' ? 'confirmed attendance' :
                     params.rsvpStatus === 'NO' ? 'declined' : 'is considering'

  const notifications = []
  for (const admin of admins) {
    const prefs = parsePreferences(admin.notificationPreferences)
    if (prefs.inApp) {
      notifications.push({
        userId: admin.id,
        type: 'RSVP_RECEIVED' as NotificationType,
        title: 'New RSVP',
        message: `${params.staffName} ${statusText} for "${params.eventTitle}"`,
        link: `/admin/events/${params.eventId}/edit`,
        read: false,
      })
    }
  }

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications })
  }

  return { notifiedCount: admins.length }
}

// Notify all admins about staff check-in
export async function notifyAdminsAboutCheckIn(params: {
  staffName: string
  staffId: string
  eventId: string
  eventTitle: string
}) {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', status: 'ACTIVE' },
    select: { id: true, notificationPreferences: true }
  })

  const notifications = []
  for (const admin of admins) {
    const prefs = parsePreferences(admin.notificationPreferences)
    if (prefs.inApp) {
      notifications.push({
        userId: admin.id,
        type: 'STAFF_CHECKIN' as NotificationType,
        title: 'Staff Check-in',
        message: `${params.staffName} has checked in to "${params.eventTitle}"`,
        link: `/admin/events/${params.eventId}/edit`,
        read: false,
      })
    }
  }

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications })
  }

  return { notifiedCount: admins.length }
}

// Notify all admins about expense submission
export async function notifyAdminsAboutExpense(params: {
  staffName: string
  staffId: string
  expenseId: string
  category: string
  description: string
}) {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', status: 'ACTIVE' },
    select: { id: true, notificationPreferences: true }
  })

  const categoryText = params.category === 'SICK_DAY' ? 'sick day' :
                       params.category === 'OFF_DAY' ? 'day off' : 'expense'

  const notifications = []
  for (const admin of admins) {
    const prefs = parsePreferences(admin.notificationPreferences)
    if (prefs.inApp) {
      notifications.push({
        userId: admin.id,
        type: 'EXPENSE_SUBMITTED' as NotificationType,
        title: `${categoryText.charAt(0).toUpperCase() + categoryText.slice(1)} Request`,
        message: `${params.staffName} submitted a ${categoryText} request: "${params.description}"`,
        link: `/admin/requests`,
        read: false,
      })
    }
  }

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications })
  }

  return { notifiedCount: admins.length }
}

// Notify staff about expense status update
export async function notifyStaffAboutExpenseStatus(params: {
  staffId: string
  expenseId: string
  category: string
  status: 'APPROVED' | 'REJECTED'
}) {
  const categoryText = params.category === 'SICK_DAY' ? 'sick day' :
                       params.category === 'OFF_DAY' ? 'day off' : 'expense'

  const statusText = params.status === 'APPROVED' ? 'approved' : 'rejected'
  const type = params.status === 'APPROVED' ? 'EXPENSE_APPROVED' : 'EXPENSE_REJECTED'

  const user = await prisma.user.findUnique({
    where: { id: params.staffId },
    select: { notificationPreferences: true }
  })

  const prefs = parsePreferences(user?.notificationPreferences || null)
  if (!prefs.inApp) {
    return { success: true }
  }

  await prisma.notification.create({
    data: {
      userId: params.staffId,
      type: type as NotificationType,
      title: `Request ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
      message: `Your ${categoryText} request has been ${statusText}.`,
      link: `/payroll/requests`,
      read: false,
    }
  })

  return { success: true }
}
