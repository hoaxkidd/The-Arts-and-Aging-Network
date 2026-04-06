import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { FormTemplateBuilder } from '@/components/admin/FormTemplateBuilder'

export default async function NewFormTemplatePage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto pt-4">
        <FormTemplateBuilder />
      </div>
    </div>
  )
}
