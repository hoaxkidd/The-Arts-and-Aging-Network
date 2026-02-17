'use client'

import { useRouter } from 'next/navigation'
import { EventSignUpFormRenderer, type TemplateForRender } from '@/components/forms/EventSignUpFormRenderer'
import { submitEventSignUpForm } from '@/app/actions/event-requests'

type Props = {
  eventId: string
  eventTitle: string
  template: TemplateForRender
}

export function EventSignUpFormClient({ eventId, eventTitle, template }: Props) {
  const router = useRouter()

  const handleSubmit = async (
    formData: Record<string, unknown>,
    attachments?: string[]
  ) => {
    const result = await submitEventSignUpForm(eventId, formData, attachments)
    if (result.error) {
      alert(result.error)
      return
    }
    router.push('/dashboard/requests')
    router.refresh()
  }

  return (
    <EventSignUpFormRenderer
      template={template}
      eventTitle={eventTitle}
      onSubmit={handleSubmit}
    />
  )
}
