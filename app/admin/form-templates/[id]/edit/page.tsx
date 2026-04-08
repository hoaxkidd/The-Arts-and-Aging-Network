import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { FormTemplateBuilder } from '@/components/admin/FormTemplateBuilder'
import { FormTemplateGroupLinksPanel } from '@/components/admin/FormTemplateGroupLinksPanel'

export default async function EditFormTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const { id } = await params
  const template = await prisma.formTemplate.findUnique({
    where: { id },
  })

  if (!template) notFound()

  // Ensure formFields is a valid string for the builder
  const safeFormFields = template.formFields ?? '[]'

  const [groupAttachments, activeGroups] = await Promise.all([
    prisma.messageGroupForm.findMany({
      where: { formTemplateId: template.id, isActive: true },
      include: {
        group: {
          select: { id: true, name: true, iconEmoji: true, isActive: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.messageGroup.findMany({
      where: { isActive: true },
      select: { id: true, name: true, iconEmoji: true, isAttachableToForms: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto pt-4 space-y-6 pb-8">
        <FormTemplateBuilder
          templateId={template.id}
          initialTitle={template.title ?? ''}
          initialDescription={template.description ?? ''}
          initialDescriptionHtml={template.descriptionHtml ?? ''}
          initialCategory={template.category ?? 'EVENT_SIGNUP'}
          initialFormFields={safeFormFields}
          initialIsPublic={template.isPublic ?? true}
          initialAllowedRoles={template.allowedRoles ?? null}
        />
        <FormTemplateGroupLinksPanel
          formTemplateId={template.id}
          attachments={groupAttachments.map((a) => ({
            groupId: a.groupId,
            group: a.group,
          }))}
          groupOptions={activeGroups}
        />
      </div>
    </div>
  )
}
