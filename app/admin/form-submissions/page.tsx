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
      <div className="flex-1 min-h-0 overflow-auto pt-4">
        <AdminFormSubmissionsList 
          submissions={submissions as any}
          editRequestCount={editRequestCount}
        />
      </div>
    </div>
  )
}
