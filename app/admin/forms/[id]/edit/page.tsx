import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { FormTemplateBuilder } from "@/components/admin/FormTemplateBuilder"

export default async function EditFormTemplatePage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const { id } = await params

  const template = await prisma.formTemplate.findUnique({
    where: { id }
  })

  if (!template) notFound()

  return (
    <div className="h-full flex flex-col">
      <FormTemplateBuilder
        templateId={template.id}
        initialTitle={template.title}
        initialDescription={template.description}
        initialDescriptionHtml={template.descriptionHtml}
        initialCategory={template.category}
        initialFormFields={template.formFields}
        initialIsPublic={template.isPublic}
        initialAllowedRoles={template.allowedRoles}
      />
    </div>
  )
}
