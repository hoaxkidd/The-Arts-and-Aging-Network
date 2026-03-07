import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { Lock } from "lucide-react"
import Link from "next/link"
import { HomeAdminFormFill } from "./HomeAdminFormFill"

export default async function HomeAdminFormFillPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id } = await params

  const template = await prisma.formTemplate.findUnique({
    where: { id }
  }) as any

  if (!template) notFound()

  // Check access - Home admins can only fill non-public (role-restricted) forms
  const userRole = session.user.role || ''
  const isAdmin = session.user.role === 'ADMIN'
  const isHomeAdmin = session.user.role === 'HOME_ADMIN'

  if (isHomeAdmin) {
    // Home admin can only access non-public forms
    if (template.isPublic) {
      return (
        <div className="p-8 text-center">
          <Lock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">This form is not accessible to Home Administrators.</p>
          <Link href="/dashboard/forms" className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block">
            Back to Forms
          </Link>
        </div>
      )
    }
  } else if (!template.isActive || !template.isPublic) {
    if (!isAdmin) {
      return (
        <div className="p-8 text-center">
          <p className="text-gray-500">This form is not available</p>
          <Link href="/dashboard/forms" className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block">
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
        <Link href={`/dashboard/forms/${id}`} className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block">
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

  return <HomeAdminFormFill template={template} existingSubmission={existingSubmission} />
}
