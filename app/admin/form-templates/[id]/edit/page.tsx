import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { FormTemplateBuilder } from '@/components/admin/FormTemplateBuilder'
import { ArrowLeft, FileText } from 'lucide-react'

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
      <header className="flex-shrink-0 pb-4 border-b border-gray-200">
        <Link href="/admin/form-templates" className="text-gray-500 hover:text-gray-700 flex items-center gap-2 mb-3 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Form Templates
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary-100 text-primary-600 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900">
              Edit form template
            </h1>
            <p className="text-xs text-gray-500">
              {template.title || 'Untitled'}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-auto pt-4">
        <FormTemplateBuilder
          templateId={template.id}
          initialTitle={template.title ?? ''}
          initialDescription={template.description ?? ''}
          initialCategory={template.category ?? 'EVENT_SIGNUP'}
          initialFormFields={safeFormFields}
        />
      </div>
    </div>
  )
}
