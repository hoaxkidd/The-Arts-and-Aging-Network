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
  const template = await prisma.formTemplate.findUnique({
    where: { id },
  })

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
        />
      </div>
    </div>
  )
}
