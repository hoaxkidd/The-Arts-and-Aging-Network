import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { FormTemplateBuilder } from '@/components/admin/FormTemplateBuilder'

export default async function EditFormTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const { id } = await params
  const [template, groups, facilitators] = await Promise.all([
    prisma.formTemplate.findUnique({
      where: { id },
    }),
    prisma.messageGroup.findMany({
      where: { isActive: true, isAttachableToForms: true },
      select: { id: true, name: true, iconEmoji: true },
      orderBy: { name: 'asc' }
    }),
    prisma.user.findMany({
      where: { status: 'ACTIVE', role: 'FACILITATOR' },
      select: { id: true, name: true, preferredName: true, role: true },
      orderBy: { name: 'asc' }
    })
  ])

  if (!template) notFound()

  // Ensure formFields is a valid string for the builder
  const safeFormFields = template.formFields ?? '[]'

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto pt-4">
        <FormTemplateBuilder
          templateId={template.id}
          initialTitle={template.title ?? ''}
          initialDescription={template.description ?? ''}
          initialDescriptionHtml={template.descriptionHtml ?? ''}
          initialCategory={template.category ?? 'EVENT_SIGNUP'}
          initialFormFields={safeFormFields}
          initialIsPublic={template.isPublic ?? true}
          initialAllowedRoles={template.allowedRoles ?? null}
          initialRequiredGroupIds={template.requiredGroupIds ?? null}
          initialRequiredPersonIds={template.requiredPersonIds ?? null}
          initialMinFacilitatorsRequired={template.minFacilitatorsRequired ?? 0}
          initialAutoFinalApproveWhenMinMet={template.autoFinalApproveWhenMinMet ?? false}
          initialFacilitatorRsvpDeadlineHours={template.facilitatorRsvpDeadlineHours ?? 48}
          availableGroups={groups}
          availableFacilitators={facilitators}
        />
      </div>
    </div>
  )
}
