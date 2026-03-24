import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { Lock } from "lucide-react"
import Link from "next/link"
import { StaffFormFill } from "@/app/staff/forms/[id]/fill/StaffFormFill"

export default async function VolunteerFormFillPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Check volunteer approval status
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, volunteerReviewStatus: true }
  })
  
  if (user?.role === 'VOLUNTEER' && user.volunteerReviewStatus !== 'APPROVED') {
    redirect('/staff/onboarding')
  }

  const { id } = await params

  const template = await prisma.formTemplate.findUnique({
    where: { id }
  }) as any

  if (!template) notFound()

  // Check access - Volunteers can access public forms OR forms with VOLUNTEER role
  const userRole = session.user.role || ''

  // Check if user has access
  const hasAccess = template.isPublic || 
    (template.allowedRoles && template.allowedRoles.includes(userRole))
  
  if (!hasAccess) {
    return (
      <div className="p-8 text-center">
        <Lock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">You don't have access to this form.</p>
        <Link href="/volunteers/forms" className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block">
          Back to Forms
        </Link>
      </div>
    )
  }

  if (!template.isFillable) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">This form is not fillable</p>
        <Link href={`/volunteers/forms/${id}`} className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block">
          Back to Form Details
        </Link>
      </div>
    )
  }

  // Get user's existing submission for this template
  const existingSubmission = await prisma.formSubmission.findFirst({
    where: {
      templateId: id,
      submittedBy: session.user.id
    },
    orderBy: { createdAt: 'desc' }
  }) as any

  return <StaffFormFill 
    template={template} 
    existingSubmission={existingSubmission} 
    redirectUrl="/volunteers"
  />
}