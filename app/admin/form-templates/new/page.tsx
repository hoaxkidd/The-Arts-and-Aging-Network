import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { FormTemplateBuilder } from '@/components/admin/FormTemplateBuilder'
import { prisma } from '@/lib/prisma'

export default async function NewFormTemplatePage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const [groups, facilitators] = await Promise.all([
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

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto pt-4">
        <FormTemplateBuilder availableGroups={groups} availableFacilitators={facilitators} />
      </div>
    </div>
  )
}
