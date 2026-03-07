import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { FileText } from "lucide-react"
import { AdminFormSubmissionsList } from "@/components/admin/AdminFormSubmissionsList"

export default async function AdminFormSubmissionsPage({
  searchParams
}: {
  searchParams: Promise<{ editRequest?: string }>
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const params = await searchParams
  const showEditRequestsOnly = params.editRequest === 'true'

  // Get all form submissions
  const whereClause: any = {}
  
  if (showEditRequestsOnly) {
    whereClause.editRequested = true
  }

  const submissions = await prisma.formSubmission.findMany({
    where: whereClause,
    include: {
      template: {
        select: {
          id: true,
          title: true,
          category: true
        }
      },
      submitter: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  })

  // Get count of pending edit requests
  const editRequestCount = await prisma.formSubmission.count({
    where: { editRequested: true }
  })

  return (
    <div className="h-full flex flex-col">
      <header className="flex-shrink-0 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary-100 text-primary-600 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900">
              Form Submissions
            </h1>
            <p className="text-xs text-gray-500">
              View and manage all form submissions
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-auto pt-4">
        <AdminFormSubmissionsList 
          submissions={submissions as any}
          editRequestCount={editRequestCount}
        />
      </div>
    </div>
  )
}
