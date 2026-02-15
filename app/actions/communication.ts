'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

// Send a direct message (email relay)
export async function sendDirectMessage(recipientId: string, subject: string, content: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  if (!subject.trim() || !content.trim()) {
    return { error: "Subject and content are required" }
  }

  try {
    // Create the message record
    const message = await prisma.directMessage.create({
      data: {
        senderId: session.user.id,
        recipientId,
        subject: subject.trim(),
        content: content.trim(),
      },
      include: {
        sender: { select: { name: true, preferredName: true } },
        recipient: { select: { name: true, email: true } }
      }
    })

    // Create notification for recipient
    const senderName = message.sender.preferredName || message.sender.name || 'A team member'
    await prisma.notification.create({
      data: {
        userId: recipientId,
        type: 'DIRECT_MESSAGE',
        title: `Message from ${senderName}`,
        message: `${senderName} sent you a message: "${subject}"`,
        link: '/staff/inbox'
      }
    })

    // TODO: Send actual email via email service
    await prisma.directMessage.update({
      where: { id: message.id },
      data: { emailSent: true }
    })

    revalidatePath('/staff/inbox')
    return { success: true, messageId: message.id }
  } catch (e) {
    console.error('sendDirectMessage error:', e)
    return { error: "Failed to send message" }
  }
}

// Request phone number from another staff member
export async function requestPhoneNumber(staffId: string, message?: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  if (staffId === session.user.id) {
    return { error: "Cannot request your own phone number" }
  }

  try {
    // Check if request already exists
    const existing = await prisma.phoneRequest.findUnique({
      where: {
        requesterId_requestedId: {
          requesterId: session.user.id,
          requestedId: staffId
        }
      }
    })

    if (existing) {
      return { error: "Request already sent", status: existing.status }
    }

    // Create the request
    const request = await prisma.phoneRequest.create({
      data: {
        requesterId: session.user.id,
        requestedId: staffId,
        message: message?.trim() || null
      },
      include: {
        requester: { select: { name: true, preferredName: true } }
      }
    })

    // Notify the staff member
    const requesterName = request.requester.preferredName || request.requester.name || 'A team member'
    await prisma.notification.create({
      data: {
        userId: staffId,
        type: 'PHONE_REQUEST',
        title: 'Phone Number Request',
        message: `${requesterName} is requesting your phone number`,
        link: '/staff/settings'
      }
    })

    revalidatePath(`/staff/directory/${staffId}`)
    return { success: true }
  } catch (e) {
    console.error('requestPhoneNumber error:', e)
    return { error: "Failed to send request" }
  }
}

// Respond to phone request
export async function respondToPhoneRequest(requestId: string, approved: boolean) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const request = await prisma.phoneRequest.findUnique({
      where: { id: requestId },
      include: {
        requested: { select: { phone: true, name: true, preferredName: true } }
      }
    })

    if (!request) return { error: "Request not found" }
    if (request.requestedId !== session.user.id) return { error: "Unauthorized" }
    if (request.status !== 'PENDING') return { error: "Request already processed" }

    await prisma.phoneRequest.update({
      where: { id: requestId },
      data: { status: approved ? 'APPROVED' : 'DENIED' }
    })

    // Notify the requester
    const staffName = request.requested.preferredName || request.requested.name || 'The staff member'
    const phoneInfo = approved && request.requested.phone
      ? ` Their number is: ${request.requested.phone}`
      : ''

    await prisma.notification.create({
      data: {
        userId: request.requesterId,
        type: 'PHONE_REQUEST_RESPONSE',
        title: approved ? 'Phone Request Approved' : 'Phone Request Declined',
        message: `${staffName} has ${approved ? 'shared their phone number with you' : 'declined your request'}.${phoneInfo}`,
        link: `/staff/directory/${request.requestedId}`
      }
    })

    revalidatePath('/staff/settings')
    return { success: true }
  } catch (e) {
    console.error('respondToPhoneRequest error:', e)
    return { error: "Failed to respond to request" }
  }
}

// Create meeting request
export async function createMeetingRequest(staffId: string, proposedDates: string[], notes?: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  if (staffId === session.user.id) {
    return { error: "Cannot request meeting with yourself" }
  }

  if (proposedDates.length === 0) {
    return { error: "At least one date must be proposed" }
  }

  try {
    const request = await prisma.meetingRequest.create({
      data: {
        requesterId: session.user.id,
        requestedId: staffId,
        proposedTimes: JSON.stringify(proposedDates),
        notes: notes?.trim() || null
      },
      include: {
        requester: { select: { name: true, preferredName: true } }
      }
    })

    // Notify the staff member
    const requesterName = request.requester.preferredName || request.requester.name || 'A team member'
    await prisma.notification.create({
      data: {
        userId: staffId,
        type: 'MEETING_REQUEST',
        title: 'Meeting Request',
        message: `${requesterName} would like to schedule a meeting with you`,
        link: '/staff/settings'
      }
    })

    revalidatePath(`/staff/directory/${staffId}`)
    return { success: true, requestId: request.id }
  } catch (e) {
    console.error('createMeetingRequest error:', e)
    return { error: "Failed to create meeting request" }
  }
}

// Respond to meeting request
export async function respondToMeetingRequest(
  requestId: string,
  accepted: boolean,
  selectedTime?: string
) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    const request = await prisma.meetingRequest.findUnique({
      where: { id: requestId },
      include: {
        requested: { select: { name: true, preferredName: true } }
      }
    })

    if (!request) return { error: "Request not found" }
    if (request.requestedId !== session.user.id) return { error: "Unauthorized" }
    if (request.status !== 'PENDING') return { error: "Request already processed" }

    await prisma.meetingRequest.update({
      where: { id: requestId },
      data: {
        status: accepted ? 'ACCEPTED' : 'DECLINED',
        selectedTime: accepted && selectedTime ? new Date(selectedTime) : null
      }
    })

    // Notify the requester
    const staffName = request.requested.preferredName || request.requested.name || 'The staff member'
    const timeInfo = accepted && selectedTime
      ? ` Selected time: ${new Date(selectedTime).toLocaleString()}`
      : ''

    await prisma.notification.create({
      data: {
        userId: request.requesterId,
        type: 'MEETING_REQUEST_RESPONSE',
        title: accepted ? 'Meeting Accepted' : 'Meeting Declined',
        message: `${staffName} has ${accepted ? 'accepted' : 'declined'} your meeting request.${timeInfo}`,
        link: `/staff/directory/${request.requestedId}`
      }
    })

    revalidatePath('/staff/settings')
    return { success: true }
  } catch (e) {
    console.error('respondToMeetingRequest error:', e)
    return { error: "Failed to respond to meeting request" }
  }
}
