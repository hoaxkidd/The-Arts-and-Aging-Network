import { getStaffDirectory } from '@/app/actions/directory'
import { DirectoryTabs } from './DirectoryTabs'
import { Search, Users } from 'lucide-react'
import { ROLE_ORDER, ROLE_LABELS_SHORT } from '@/lib/roles'

export default async function StaffDirectoryPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const params = await searchParams
  const search = params.search || ''
  const result = await getStaffDirectory(search)

  if ('error' in result) {
    return <div className="text-red-600 text-sm">{result.error}</div>
  }

  const { staff } = result

  // Group staff by role
  const grouped: Record<string, typeof staff> = {}
  for (const member of staff) {
    if (!grouped[member.role]) grouped[member.role] = []
    grouped[member.role].push(member)
  }

  const groups = ROLE_ORDER
    .filter(role => grouped[role]?.length)
    .map(role => ({
      role,
      label: ROLE_LABELS_SHORT[role] || role,
      members: grouped[role]
    }))

  return (
    <div className="h-full flex flex-col">
      {/* Header - consistent with other staff pages */}
      <header className="flex-shrink-0 pb-3 border-b border-gray-200">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-primary-100 text-primary-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-gray-900">Team Directory</h1>
              <p className="text-xs text-gray-500">
                {staff.length} member{staff.length !== 1 ? 's' : ''} · {groups.length} group{groups.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <form className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white"
            />
          </form>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 min-h-0 pt-3">
        {search && (
          <p className="text-xs text-gray-500 mb-2">
            Results for &quot;{search}&quot;
          </p>
        )}

        {groups.length > 0 ? (
          <DirectoryTabs groups={groups} />
        ) : (
          <div className="text-center py-12">
            <Users className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-medium text-gray-900">No team members found</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {search ? 'Try adjusting your search' : 'No active staff yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
