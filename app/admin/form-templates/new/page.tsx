import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { FormTemplateBuilder } from '@/components/admin/FormTemplateBuilder'
import { FileText } from 'lucide-react'

export default async function NewFormTemplatePage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  return (
    <div className="h-full flex flex-col">
      <header className="flex-shrink-0 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary-100 text-primary-600 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900">
              New form template
            </h1>
            <p className="text-xs text-gray-500">
              Create a form for event sign-up or staff use
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-auto pt-4">
        <FormTemplateBuilder />
      </div>
    </div>
  )
}
