'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'
import { hash } from 'bcryptjs'
import { createUserWithGeneratedCode } from '@/lib/user-code'
import { generateNextInviteCode } from '@/lib/invite-code'
import { sendEmail, sendEmailWithRetry, sendEmailWithCustomContent } from '@/lib/email/service'
import { logger } from '@/lib/logger'
import { canMergeRoles, normalizeRoleList } from '@/lib/roles'

const APP_URL = process.env.NEXTAUTH_URL || 'https://artsandaging.com'

async function notifyAdminsOfEmailChangeRequest(invitationId: string, originalEmail: string, newEmail: string) {
  try {
    // Get admin users
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' }
    })

    if (admins.length === 0) return

    // Create in-app notifications
    await prisma.notification.createMany({
      data: admins.map(admin => ({
        userId: admin.id,
        type: 'EMAIL_CHANGE_REQUEST',
        title: 'Email Change Request',
        message: `User requested to change invitation from ${originalEmail} to ${newEmail}`,
        link: '/admin/invitations?filter=email-changes'
      }))
    })

    // Send email notifications to admins
    for (const admin of admins) {
      if (admin.email) {
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #F5E050; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #1F2937; margin: 0;">Email Change Request</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 20px; color: #111827;">A user has requested to change their invitation email.</p>
              <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Original Email:</strong> ${originalEmail}</p>
                <p style="margin: 5px 0;"><strong>Requested Email:</strong> ${newEmail}</p>
              </div>
              <p style="margin: 20px 0 0; color: #6b7280;">Please review and approve or reject this request in the admin panel.</p>
            </div>
          </div>
        `
        await sendEmailWithCustomContent(
          admin.email,
          'Email Change Request - Action Required',
          htmlContent
        ).catch(() => {})
      }
    }
  } catch (error) {
    logger.serverAction('Failed to notify admins of email change request', error)
  }
}

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'PAYROLL', 'FACILITATOR', 'PARTNER', 'VOLUNTEER', 'BOARD', 'HOME_ADMIN']),
})

export async function createInvitation(formData: FormData) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  const validatedFields = inviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
  })

  if (!validatedFields.success) {
    return { error: 'Invalid fields' }
  }

  const { email, role } = validatedFields.data

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } })

  // Existing active account: treat invitation as role assignment request.
  if (existingUser && (existingUser.password || existingUser.status === 'ACTIVE')) {
    const assignments = await prisma.userRoleAssignment.findMany({
      where: { userId: existingUser.id, isActive: true },
      orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }],
    })
    const currentRoles = assignments.length > 0
      ? normalizeRoleList(assignments.map((assignment) => assignment.role))
      : [existingUser.role]

    if (currentRoles.includes(role)) {
      return { error: 'User already has this role' }
    }

    const mergeCheck = canMergeRoles(currentRoles, role)
    if (!mergeCheck.ok) {
      return { error: mergeCheck.error }
    }

    await prisma.$transaction(async (tx) => {
      if (assignments.length === 0) {
        await tx.userRoleAssignment.create({
          data: {
            userId: existingUser.id,
            role: existingUser.role,
            isPrimary: true,
            isActive: true,
            assignedById: session.user.id,
          },
        })
      }

      await tx.userRoleAssignment.create({
        data: {
          userId: existingUser.id,
          role,
          isPrimary: false,
          isActive: true,
          assignedById: session.user.id,
        },
      })

      await tx.auditLog.create({
        data: {
          action: 'USER_ROLE_ADDED_BY_INVITATION',
          details: JSON.stringify({ email, role, userId: existingUser.id }),
          userId: session.user.id,
        },
      })
    })

    revalidatePath('/admin/invitations')
    revalidatePath('/admin/users')
    return { success: true, roleAssigned: true }
  }

  // Check if pending invitation exists
  // We can just create a new one or error out. Let's create new.
  
  const token = randomBytes(32).toString('hex')
  const inviteCode = await generateNextInviteCode()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  try {
    const invitation = await prisma.invitation.create({
      data: {
        email,
        role,
        inviteCode,
        token,
        expiresAt,
        createdById: session.user.id,
        // If an existing placeholder user exists (no password and non-ACTIVE),
        // link this invitation to that user so we can activate it on acceptance.
        userId: existingUser && !existingUser.password && existingUser.status !== 'ACTIVE'
          ? existingUser.id
          : undefined,
      },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'INVITATION_CREATED',
        details: JSON.stringify({ email, role }),
        userId: session.user.id,
      }
    })

    // Send invitation email directly (bypass user preferences for invitations)
    const base = 'https://the-arts-and-aging-network.vercel.app'
    const inviteUrl = `${base}/invite/${inviteCode}`

    console.log('[Invitation] Attempting to send invitation email:', {
      to: email,
      inviteUrl,
      role,
      name: existingUser?.name || email
    })

    const emailResult = await sendEmail({
      to: email,
      templateType: 'INVITATION',
      variables: {
        inviteUrl,
        role,
        name: existingUser?.name || email,
        appUrl: 'https://the-arts-and-aging-network.vercel.app',
      }
    })

    console.log('[Invitation] Email result:', emailResult)

    if (!emailResult.success) {
      logger.serverAction('Failed to send invitation email', emailResult.error)
      // Still return success for invitation creation, but note email failure
      revalidatePath('/admin/invitations')
      return { success: true, token, emailSent: false, emailError: emailResult.error }
    }

    revalidatePath('/admin/invitations')
    return { success: true, token, emailSent: true }
  } catch (error) {
    logger.serverAction('Failed to create invitation', error)
    return { error: 'Failed to create invitation' }
  }
}

export async function sendHomeInvitation(homeId: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  const home = await prisma.geriatricHome.findUnique({
    where: { id: homeId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          password: true,
          status: true
        }
      }
    }
  })

  if (!home) return { error: 'Home not found' }

  const recipientEmail = home.user.email || home.contactEmail || ''
  if (!recipientEmail || !recipientEmail.includes('@')) {
    return { error: 'No valid linked email found for this home' }
  }

  if (home.user.password || home.user.status === 'ACTIVE') {
    return { error: 'Linked user is already active' }
  }

  const token = randomBytes(32).toString('hex')
  const inviteCode = await generateNextInviteCode()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  try {
    await prisma.invitation.create({
      data: {
        email: recipientEmail,
        role: 'HOME_ADMIN',
        inviteCode,
        token,
        expiresAt,
        createdById: session.user.id,
        userId: home.userId,
      }
    })

    const base = APP_URL.replace(/\/$/, '')
    const inviteUrl = `${base}/invite/${token}`

    const sendResult = await sendEmail({
      to: recipientEmail,
      templateType: 'INVITATION',
      variables: {
        inviteUrl,
        role: 'HOME_ADMIN'
      }
    })

    if (!sendResult.success) {
      return { error: sendResult.error || 'Failed to send invitation email' }
    }

    await prisma.auditLog.create({
      data: {
        action: 'INVITATION_SENT',
        details: JSON.stringify({ homeId, email: recipientEmail, provider: 'unified-email-service' }),
        userId: session.user.id,
      }
    })

    revalidatePath('/admin/homes')
    revalidatePath('/admin/users')
    revalidatePath('/admin/invitations')

    return { success: true }
  } catch (error) {
    logger.serverAction('sendHomeInvitation error', error)
    return { error: 'Failed to send invitation' }
  }
}

export async function cancelInvitation(id: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  try {
    const invitation = await prisma.invitation.delete({
      where: { id },
    })

    await prisma.auditLog.create({
      data: {
        action: 'INVITATION_CANCELLED',
        details: JSON.stringify({ email: invitation.email, role: invitation.role }),
        userId: session.user.id,
      }
    })

    revalidatePath('/admin/invitations')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to cancel invitation' }
  }
}

export async function acceptInvitation(token: string, formData: FormData) {
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const role = formData.get('role') as string
  
  // Role-specific fields
  const skillsStr = formData.get('skills') as string
  const skills = skillsStr ? JSON.parse(skillsStr) : []
  const referralSource = formData.get('referralSource') as string
  const emergencyContactName = formData.get('emergencyContactName') as string
  const emergencyContactPhone = formData.get('emergencyContactPhone') as string
  const emergencyContactRelationship = formData.get('emergencyContactRelationship') as string
  const position = formData.get('position') as string
  const employmentType = formData.get('employmentType') as string
  const organizationName = formData.get('organizationName') as string
  const organizationType = formData.get('organizationType') as string
  const boardPosition = formData.get('boardPosition') as string
  const termStart = formData.get('termStart') as string
  const facilityName = formData.get('facilityName') as string
  const selectedFacilityId = formData.get('selectedFacilityId') as string
  const requestNewFacility = formData.get('requestNewFacility') === 'true'
  const requestedEmail = formData.get('requestedEmail') as string

  if (!password || password.length < 6) return { error: 'Password too short' }
  if (!name) return { error: 'Name required' }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
  })

  if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt < new Date()) {
    return { error: 'Invalid or expired invitation' }
  }

  // Handle email change request
  if (requestedEmail && requestedEmail !== invitation.email) {
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestedEmail)) {
      return { error: 'Invalid email format' }
    }
    
    // Check if email is already in use
    const existingUser = await prisma.user.findUnique({ where: { email: requestedEmail } })
    if (existingUser) {
      return { error: 'This email is already in use' }
    }
    
    // Check if there's already a pending request
    const existingPending = await prisma.invitation.findFirst({
      where: { 
        requestedEmail: requestedEmail,
        emailChangeStatus: 'PENDING'
      }
    })
    if (existingPending) {
      return { error: 'A request for this email is already pending' }
    }
    
    // Update invitation with email change request
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        requestedEmail,
        emailChangeStatus: 'PENDING',
        emailChangeRequestedAt: new Date()
      }
    })
    
    // Notify admins of email change request
    await notifyAdminsOfEmailChangeRequest(invitation.id, invitation.email, requestedEmail)
    
    return { 
      success: true, 
      pendingEmailChange: true,
      message: 'Email change request submitted. Admin will review and send new invitation if approved.'
    }
  }

  const hashedPassword = await hash(password, 12)

  // Handle HOME_ADMIN facility linking
  // For HOME_ADMIN: mark as PENDING_APPROVAL, admin will link facility after approval
  let userStatus: string = 'ACTIVE'
  let facilityLinkRequested = false
  let requestedFacilityName = ''
  
  if (role === 'HOME_ADMIN') {
    if (requestNewFacility && facilityName) {
      userStatus = 'PENDING_APPROVAL'
      facilityLinkRequested = true
      requestedFacilityName = facilityName
    } else if (selectedFacilityId) {
      // Directly link to selected facility (admin pre-approved)
      facilityLinkRequested = false
      // Will link after user is created
    } else {
      userStatus = 'PENDING_APPROVAL'
    }
  }

  // Build emergency contact JSON if provided
  let emergencyContact: string | undefined
  if (emergencyContactName && emergencyContactPhone && emergencyContactRelationship) {
    emergencyContact = JSON.stringify({
      name: emergencyContactName,
      phone: emergencyContactPhone,
      relationship: emergencyContactRelationship
    })
  }

  // Build roleData JSON
  const roleData: Record<string, any> = {}
  if (skills.length > 0) roleData.skills = skills
  if (referralSource) roleData.referralSource = referralSource
  if (position) roleData.position = position
  if (employmentType) roleData.employmentType = employmentType
  if (organizationName) roleData.organizationName = organizationName
  if (organizationType) roleData.organizationType = organizationType
  if (boardPosition) roleData.boardPosition = boardPosition
  if (termStart) roleData.termStart = termStart

  try {
    const invitationUserId = invitation.userId
    let userId: string | null = null

    // Add facility info to roleData for HOME_ADMIN
    if (role === 'HOME_ADMIN' && requestedFacilityName) {
      roleData.requestedFacilityName = requestedFacilityName
      roleData.facilityApprovalPending = true
    }

    // For volunteers, set initial review status
    let volunteerReviewStatus: string | undefined
    if (role === 'VOLUNTEER') {
      volunteerReviewStatus = 'PENDING_REVIEW'
    }

    if (invitationUserId) {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: invitationUserId },
          data: {
            email: invitation.email,
            name,
            password: hashedPassword,
            role: invitation.role,
            status: userStatus,
            phone: phone || undefined,
            emergencyContact,
            roleData: Object.keys(roleData).length > 0 ? JSON.stringify(roleData) : undefined,
            volunteerReviewStatus,
          },
        })

        await tx.userRoleAssignment.updateMany({
          where: { userId: invitationUserId },
          data: { isPrimary: false },
        })

        await tx.userRoleAssignment.upsert({
          where: {
            userId_role: {
              userId: invitationUserId,
              role: invitation.role,
            },
          },
          create: {
            userId: invitationUserId,
            role: invitation.role,
            isPrimary: true,
            isActive: true,
          },
          update: {
            isPrimary: true,
            isActive: true,
          },
        })

        // Delete the invitation after successful user creation
        await tx.invitation.delete({
          where: { id: invitation.id },
        })
      })
      userId = invitationUserId
    } else {
      const newUser = await prisma.$transaction(async (tx) => {
        const user = await createUserWithGeneratedCode(tx, {
          email: invitation.email,
          name,
          password: hashedPassword,
          role: invitation.role,
          status: userStatus,
          phone: phone || undefined,
          emergencyContact,
          roleData: Object.keys(roleData).length > 0 ? JSON.stringify(roleData) : undefined,
          volunteerReviewStatus,
        })

        await tx.userRoleAssignment.create({
          data: {
            userId: user.id,
            role: invitation.role,
            isPrimary: true,
            isActive: true,
          },
        })

        // Delete the invitation after successful user creation
        await tx.invitation.delete({
          where: { id: invitation.id },
        })
        return user
      })
      userId = newUser.id
    }

    // Send welcome email
    if (userId && invitation.email) {
      const welcomeMessage = invitation.role === 'VOLUNTEER' 
        ? 'Welcome to Arts and Aging! Please complete your volunteer profile to get started.'
        : 'Welcome to Arts and Aging! We\'re excited to have you join our community.'
      
      await sendEmailWithRetry({
        to: invitation.email,
        templateType: 'WELCOME',
        variables: {
          name,
          message: welcomeMessage
        }
      }, { userId })
    }

    // For volunteers, redirect to onboarding
    const redirectUrl = invitation.role === 'VOLUNTEER' ? '/volunteers/onboarding?new=true' : null
    
    return { success: true, redirectUrl }
  } catch (error) {
    logger.serverAction('acceptInvitation error', error)
    return { error: 'Failed to create or activate user' }
  }
}
