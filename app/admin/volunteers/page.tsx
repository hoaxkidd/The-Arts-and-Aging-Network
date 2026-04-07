import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { Users, Check, X, Eye, Clock } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"
import { formatDateShort } from "@/lib/date-utils"
import { sendEmailWithCustomContent } from "@/lib/email/service"
import { createNotification } from "@/lib/notifications"

export const dynamic = 'force-dynamic'

export default async function AdminVolunteersPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    redirect("/")
  }

  // Get volunteers with pending review
  const pendingVolunteers = await prisma.user.findMany({
    where: {
      role: 'VOLUNTEER',
      volunteerReviewStatus: 'PENDING_REVIEW'
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  })

  // Get volunteers needing corrections
  const correctionVolunteers = await prisma.user.findMany({
    where: {
      role: 'VOLUNTEER',
      volunteerReviewStatus: 'REQUEST_CORRECTIONS'
    },
    orderBy: { updatedAt: 'desc' },
    take: 50
  })

  // Get approved volunteers
  const approvedVolunteers = await prisma.user.findMany({
    where: {
      role: 'VOLUNTEER',
      volunteerReviewStatus: 'APPROVED'
    },
    orderBy: { updatedAt: 'desc' },
    take: 20
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-primary-600" />
        <h1 className="text-2xl font-bold text-gray-900">Volunteer Management</h1>
      </div>

      {/* Pending Review Section */}
      <div className={cn(STYLES.card, "p-6")}>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-yellow-600" />
          <h2 className="text-lg font-semibold text-gray-900">Pending Review ({pendingVolunteers.length})</h2>
        </div>
        
        {pendingVolunteers.length === 0 ? (
          <p className="text-gray-500 text-sm">No volunteers pending review.</p>
        ) : (
          <div className="space-y-3">
            {pendingVolunteers.map(volunteer => (
              <VolunteerCard key={volunteer.id} volunteer={volunteer} />
            ))}
          </div>
        )}
      </div>

      {/* Needs Corrections Section */}
      <div className={cn(STYLES.card, "p-6")}>
        <div className="flex items-center gap-2 mb-4">
          <X className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-semibold text-gray-900">Request Corrections ({correctionVolunteers.length})</h2>
        </div>
        
        {correctionVolunteers.length === 0 ? (
          <p className="text-gray-500 text-sm">No volunteers needing corrections.</p>
        ) : (
          <div className="space-y-3">
            {correctionVolunteers.map(volunteer => (
              <VolunteerCard key={volunteer.id} volunteer={volunteer} />
            ))}
          </div>
        )}
      </div>

      {/* Approved Section */}
      <div className={cn(STYLES.card, "p-6")}>
        <div className="flex items-center gap-2 mb-4">
          <Check className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Recently Approved ({approvedVolunteers.length})</h2>
        </div>
        
        {approvedVolunteers.length === 0 ? (
          <p className="text-gray-500 text-sm">No approved volunteers yet.</p>
        ) : (
          <div className="space-y-3">
            {approvedVolunteers.map(volunteer => (
              <VolunteerCard key={volunteer.id} volunteer={volunteer} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function VolunteerCard({ volunteer }: { volunteer: any }) {
  const roleData = volunteer.roleData ? JSON.parse(volunteer.roleData) : {}
  const emergencyContact = volunteer.emergencyContact ? JSON.parse(volunteer.emergencyContact) : {}

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-primary-600 font-medium">
                {volunteer.name?.[0] || 'V'}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900">{volunteer.name || 'No name'}</p>
              <p className="text-sm text-gray-500">{volunteer.email}</p>
              <p className="text-sm text-gray-500">Phone: {volunteer.phone || 'Not provided'}</p>
            </div>
          </div>
          
          {roleData.skills && roleData.skills.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">Skills:</p>
              <div className="flex flex-wrap gap-1">
                {roleData.skills.map((skill: string) => (
                  <span key={skill} className="px-2 py-0.5 bg-secondary-100 text-secondary-800 rounded text-xs">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {emergencyContact.name && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">Emergency Contact:</p>
              <p className="text-sm text-gray-700">
                {emergencyContact.name} ({emergencyContact.relationship}) - {emergencyContact.phone}
              </p>
            </div>
          )}
          
          <p className="text-xs text-gray-400 mt-2">
            Applied: {formatDateShort(volunteer.createdAt)}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <form action={async () => {
            'use server'
            await approveVolunteer(volunteer.id)
          }}>
            <button
              type="submit"
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Approve"
            >
              <Check className="w-5 h-5" />
            </button>
          </form>
          
          <form action={async () => {
            'use server'
            await requestVolunteerCorrections(volunteer.id)
          }}>
            <button
              type="submit"
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Request Corrections"
            >
              <X className="w-5 h-5" />
            </button>
          </form>
          
          <a
            href={`/admin/users/${volunteer.id}`}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye className="w-5 h-5" />
          </a>
        </div>
      </div>
    </div>
  )
}

async function approveVolunteer(userId: string) {
  'use server'
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }
  
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return { error: 'User not found' }
  
  await prisma.user.update({
    where: { id: userId },
    data: { volunteerReviewStatus: 'APPROVED' }
  })
  
  revalidatePath('/admin/volunteers')
  
  await createNotification({
    userId: userId,
    type: 'GENERAL',
    title: 'Volunteer Application Approved',
    message: 'Your volunteer application has been approved! You now have full access to the volunteer portal.',
  })
  
  await sendEmailWithCustomContent(
    user.email!,
    'Your Volunteer Application Has Been Approved',
    `
      <h2>Welcome as an Approved Volunteer!</h2>
      <p>Dear ${user.name || 'Volunteer'},</p>
      <p>Your volunteer application has been approved. You now have full access to the volunteer portal.</p>
      <p>You can now:</p>
      <ul>
        <li>View and sign up for volunteer opportunities</li>
        <li>Track your hours and activities</li>
        <li>Connect with other volunteers</li>
      </ul>
      <p>Log in to get started: <a href="https://the-arts-and-aging-network.vercel.app">Volunteer Portal</a></p>
      <p>Thank you for volunteering with us!</p>
    `
  )
}

async function requestVolunteerCorrections(userId: string) {
  'use server'
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }
  
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return { error: 'User not found' }
  
  await prisma.user.update({
    where: { id: userId },
    data: { volunteerReviewStatus: 'REQUEST_CORRECTIONS' }
  })
  
  revalidatePath('/admin/volunteers')
  
  await createNotification({
    userId: userId,
    type: 'GENERAL',
    title: 'Volunteer Application - Corrections Needed',
    message: 'Your volunteer application needs some corrections. Please review and update your profile.',
  })
  
  await sendEmailWithCustomContent(
    user.email!,
    'Volunteer Application - Corrections Needed',
    `
      <h2>Corrections Needed</h2>
      <p>Dear ${user.name || 'Volunteer'},</p>
      <p>Thank you for your interest in volunteering with us. After reviewing your application, we need some additional information or corrections before we can proceed.</p>
      <p>Please log in to your profile and make the necessary updates:</p>
      <ul>
        <li>Review your contact information</li>
        <li>Complete any missing required fields</li>
        <li>Add emergency contact information</li>
        <li>Verify your availability and skills</li>
      </ul>
      <p>Update your profile: <a href="https://the-arts-and-aging-network.vercel.app/staff/onboarding">Onboarding Page</a></p>
      <p>If you have any questions, please contact us.</p>
    `
  )
}
