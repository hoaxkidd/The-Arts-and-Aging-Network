import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { EventSignUpFormClient } from './EventSignUpFormClient'
import { ArrowLeft, Calendar } from 'lucide-react'
import Link from 'next/link'

export default async function EventSignUpPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (session.user.role !== 'HOME_ADMIN') redirect('/dashboard')

  const { eventId } = await params

  const home = await prisma.geriatricHome.findUnique({
    where: { userId: session.user.id },
    select: { id: true }
  })
  if (!home) redirect('/dashboard')

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      location: { select: { name: true } },
      requiredFormTemplate: true
    }
  })

  if (!event) notFound()
  if (event.status !== 'PUBLISHED') notFound()
  if (!event.requiredFormTemplateId || !event.requiredFormTemplate) {
    redirect(`/dashboard/bookings`)
  }

  const existingRequest = await prisma.eventRequest.findFirst({
    where: {
      geriatricHomeId: home.id,
      existingEventId: eventId,
      status: { in: ['PENDING', 'APPROVED'] }
    }
  })
  if (existingRequest) redirect('/dashboard/my-bookings?section=requests')

  const template = {
    title: event.requiredFormTemplate.title,
    description: event.requiredFormTemplate.description,
    formFields: event.requiredFormTemplate.formFields,
  }

  return (
    <div className="h-full flex flex-col max-w-3xl mx-auto">
      <div className="flex-1 min-h-0 overflow-auto pt-6">
        <Link href="/dashboard/bookings" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Bookings
        </Link>
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Calendar className="w-4 h-4" />
          <span className="font-medium text-gray-900">{event.title}</span>
          {event.location && (
            <span className="text-gray-500">· {event.location.name}</span>
          )}
        </div>
        <EventSignUpFormClient
          eventId={eventId}
          eventTitle={event.title}
          template={template}
        />
      </div>
    </div>
  )
}
