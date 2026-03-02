import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { EventForm } from "@/components/admin/EventForm"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function NewEventPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'PAYROLL') redirect('/dashboard')

  const [locations, formTemplates] = await Promise.all([
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
    prisma.formTemplate.findMany({
      where: { isActive: true, isFillable: true },
      select: { id: true, title: true },
      orderBy: { title: 'asc' },
    }),
  ])

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 py-2 -mx-4 px-4 md:-mx-6 md:px-6 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200">
        <Link href="/admin/events" className="text-gray-500 hover:text-gray-700 flex items-center gap-2 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </Link>
      </div>
      <EventForm
        locations={locations}
        formTemplates={formTemplates}
        currentUser={session?.user ? { name: session.user.name ?? '', email: session.user.email ?? '', role: session.user.role ?? '' } : null}
      />
    </div>
  )
}
