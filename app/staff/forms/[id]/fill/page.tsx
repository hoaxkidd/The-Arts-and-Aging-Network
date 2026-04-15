import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { Lock } from "lucide-react"
import Link from "next/link"
import { StaffFormFill } from "./StaffFormFill"
import { canAccessTemplate } from "@/lib/form-access"
import { getStaffBasePathForRole } from "@/lib/role-routes"

export default async function StaffFormFillPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const basePath = getStaffBasePathForRole(session.user.role)

  const { id } = await params

  const template = await prisma.formTemplate.findUnique({
    where: { id }
  }) as any

  if (!template) notFound()

  // Check access - Staff can access public forms OR role-restricted forms
  const isAdmin = session.user.role === 'ADMIN'
  const roles = Array.isArray(session.user.roles) ? session.user.roles : (session.user.role ? [session.user.role] : [])

  if (!isAdmin) {
    const allowed = canAccessTemplate(
      { isActive: Boolean(template.isActive), isPublic: Boolean(template.isPublic), allowedRoles: template.allowedRoles ?? null },
      { roles, isHomeAdmin: false }
    )
    if (!allowed) {
      return (
        <div className="p-8 text-center">
          <Lock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">You don't have access to this form.</p>
          <Link href={`${basePath}/forms`} className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block">
            Back to Forms
          </Link>
        </div>
      )
    }
  }

  if (!template.isFillable) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">This form is not fillable</p>
        <Link href={`${basePath}/forms/${id}`} className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block">
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

  return <StaffFormFill template={template} existingSubmission={existingSubmission} />
}
