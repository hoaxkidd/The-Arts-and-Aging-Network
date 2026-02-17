import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { EventSignUpFormClient } from './EventSignUpFormClient'
import { FileText, Calendar } from 'lucide-react'

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
    redirect(`/dashboard/calendar`)
  }

  const existingRequest = await prisma.eventRequest.findFirst({
    where: {
      geriatricHomeId: home.id,
      existingEventId: eventId,
      status: { in: ['PENDING', 'APPROVED'] }
    }
  })
  if (existingRequest) redirect('/dashboard/requests')

  const template = {
    title: event.requiredFormTemplate.title,
    description: event.requiredFormTemplate.description,
    formFields: event.requiredFormTemplate.formFields,
  }

  return (
    <div className="h-full flex flex-col max-w-3xl mx-auto">
      <header className="flex-shrink-0 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary-100 text-primary-600 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900">Event sign-up</h1>
            <p className="text-xs text-gray-500">
              Complete the form below to request participation
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-auto pt-6">
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
