import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { StaffEventDetail } from "@/components/staff/StaffEventDetail"
import { getStaffEventDetail } from "@/app/actions/staff-attendance"

export default async function StaffEventDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id } = await params

  const result = await getStaffEventDetail(id)

  if (result.error || !result.data) {
    notFound()
  }

  return <StaffEventDetail event={result.data as any} />
}
