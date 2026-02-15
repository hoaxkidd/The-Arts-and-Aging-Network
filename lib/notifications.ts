import { prisma } from "@/lib/prisma"

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

  console.log(`Found ${staffMembers.length} users to notify`)

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
    console.log(`Created ${inAppNotifications.length} in-app notifications`)
  }

  // Send emails/SMS (non-blocking)
  // We use Promise.allSettled to ensure one failure doesn't stop others
  const notificationPromises = []

  for (const staff of staffMembers) {
    const prefs = parsePreferences(staff.notificationPreferences)
    
    if (prefs.email) {
      notificationPromises.push(
        sendEventNotificationEmail({
          to: staff.email,
          name: staff.name || 'Staff Member',
          subject: title,
          content: message,
          link
        }).catch(e => console.error(`Failed to email ${staff.email}`, e))
      )
    }

    if (prefs.sms && staff.phone) {
      notificationPromises.push(
        sendSMS({
          to: staff.phone,
          message: `${title}: ${message}`
        }).catch(e => console.error(`Failed to sms ${staff.phone}`, e))
      )
    }
  }

  // Don't await this if you want it to be truly background, but for now we await to ensure logs appear
  await Promise.allSettled(notificationPromises)

  return { notifiedCount: staffMembers.length }
}

// Notify all staff members about an event UPDATE
export async function notifyAllStaffAboutEventUpdate(event: {
    id: string
    title: string
    startDateTime: Date
    changes: string
  }) {
  

    const staffMembers = await prisma.user.findMany({
      where: { role: { in: ['PAYROLL', 'ADMIN'] } },
      select: { id: true, email: true, name: true, phone: true, notificationPreferences: true }
    })

    console.log(`Found ${staffMembers.length} users to notify`)
  
    const title = 'Event Updated'
    const message = `Updates for "${event.title}": ${event.changes}`
    const link = `/events/${event.id}`
  
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
      console.log(`Created ${inAppNotifications.length} in-app notifications`)
    }

    // Send emails/SMS (non-blocking)
    const notificationPromises = []

    for (const staff of staffMembers) {
      const prefs = parsePreferences(staff.notificationPreferences)
      
      if (prefs.email) {
        notificationPromises.push(
            sendEventNotificationEmail({
            to: staff.email,
            name: staff.name || 'Staff Member',
            subject: title,
            content: message,
            link
            }).catch(e => console.error(`Failed to email ${staff.email}`, e))
        )
      }

      if (prefs.sms && staff.phone) {
        notificationPromises.push(
            sendSMS({
            to: staff.phone,
            message: `${title}: ${message}`
            }).catch(e => console.error(`Failed to sms ${staff.phone}`, e))
        )
      }
    }

    await Promise.allSettled(notificationPromises)
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
  
    console.log(`Found ${staffMembers.length} users to notify`)

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
      console.log(`Created ${inAppNotifications.length} in-app notifications`)
    }

    // Send emails/SMS (non-blocking)
    const notificationPromises = []

    for (const staff of staffMembers) {
      const prefs = parsePreferences(staff.notificationPreferences)
      
      if (prefs.email) {
        notificationPromises.push(
            sendEventNotificationEmail({
            to: staff.email,
            name: staff.name || 'Staff Member',
            subject: title,
            content: message,
            link: ''
            }).catch(e => console.error(`Failed to email ${staff.email}`, e))
        )
      }

      if (prefs.sms && staff.phone) {
        notificationPromises.push(
            sendSMS({
            to: staff.phone,
            message: `${title}: ${message}`
            }).catch(e => console.error(`Failed to sms ${staff.phone}`, e))
        )
      }
    }

    await Promise.allSettled(notificationPromises)
}

// SMS sending function (placeholder)
async function sendSMS(params: { to: string, message: string }) {
    console.log(`
📱 SMS NOTIFICATION
To: ${params.to}
Message: ${params.message}
    `)
    return true
}

// Email sending function (placeholder - implement with actual email service)
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

  console.log(`
📧 EMAIL NOTIFICATION
To: ${params.to}
Subject: ${subject}

Hi ${params.name},

${content}

${link ? `View details: ${process.env.NEXTAUTH_URL}${link}` : ''}

Best regards,
The Events Team
  `)

  return true
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
    select: { id: true }
  })

  const statusText = params.rsvpStatus === 'YES' ? 'confirmed attendance' :
                     params.rsvpStatus === 'NO' ? 'declined' : 'is considering'

  const notifications = admins.map(admin => ({
    userId: admin.id,
    type: 'RSVP_RECEIVED' as NotificationType,
    title: 'New RSVP',
    message: `${params.staffName} ${statusText} for "${params.eventTitle}"`,
    link: `/admin/events/${params.eventId}`,
    read: false,
    emailSent: false,
  }))

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
    select: { id: true }
  })

  const notifications = admins.map(admin => ({
    userId: admin.id,
    type: 'STAFF_CHECKIN' as NotificationType,
    title: 'Staff Check-in',
    message: `${params.staffName} has checked in to "${params.eventTitle}"`,
    link: `/admin/events/${params.eventId}`,
    read: false,
    emailSent: false,
  }))

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
    select: { id: true }
  })

  const categoryText = params.category === 'SICK_DAY' ? 'sick day' :
                       params.category === 'OFF_DAY' ? 'day off' : 'expense'

  const notifications = admins.map(admin => ({
    userId: admin.id,
    type: 'EXPENSE_SUBMITTED' as NotificationType,
    title: `${categoryText.charAt(0).toUpperCase() + categoryText.slice(1)} Request`,
    message: `${params.staffName} submitted a ${categoryText} request: "${params.description}"`,
    link: `/admin/expenses`,
    read: false,
    emailSent: false,
  }))

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

  await prisma.notification.create({
    data: {
      userId: params.staffId,
      type: type as NotificationType,
      title: `Request ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
      message: `Your ${categoryText} request has been ${statusText}.`,
      link: `/payroll/requests`,
      read: false,
      emailSent: false,
    }
  })

  return { success: true }
}
