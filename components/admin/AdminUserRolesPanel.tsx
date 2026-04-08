import { redirect } from 'next/navigation'
import { Save } from 'lucide-react'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { ROLE_ORDER, ROLE_LABELS, isValidRole } from '@/lib/roles'
import { updateUserRoles, updateVolunteerReviewStatus } from '@/app/actions/user'

type RoleAssignment = { role: string; isPrimary: boolean }

type Props = {
  userId: string
  canonicalIdentifier: string
  /** Legacy single role on user row */
  userRole: string
  roleAssignments: RoleAssignment[]
  volunteerReviewStatus: string | null
}

export function AdminUserRolesPanel({
  userId,
  canonicalIdentifier,
  userRole,
  roleAssignments,
  volunteerReviewStatus,
}: Props) {
  const activeRoles = roleAssignments.map((a) => a.role)
  const primaryRole =
    roleAssignments.find((a) => a.isPrimary)?.role || userRole

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 sm:px-5 border-b border-gray-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">Roles</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Primary controls landing page. BOARD is exclusive.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {activeRoles.map((role) => (
              <span
                key={role}
                className={cn(
                  STYLES.badge,
                  role === primaryRole ? STYLES.badgeInfo : STYLES.badgeNeutral
                )}
              >
                {ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role}
                {role === primaryRole ? ' · Primary' : ''}
              </span>
            ))}
          </div>
        </div>
      </div>

      <details className="group border-t border-gray-100">
        <summary className="cursor-pointer list-none px-4 py-3 sm:px-5 text-sm font-medium text-primary-700 hover:text-primary-900 [&::-webkit-details-marker]:hidden flex items-center gap-2">
          <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
          Edit roles
        </summary>
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <form
            action={async (formData) => {
              'use server'
              const result = await updateUserRoles(userId, formData)
              if (result?.error) {
                redirect(
                  `/admin/users/${canonicalIdentifier}?roleError=${encodeURIComponent(result.error)}`
                )
              }
              redirect(
                `/admin/users/${canonicalIdentifier}?roleMessage=${encodeURIComponent('Roles updated')}`
              )
            }}
          >
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className={STYLES.table}>
                  <thead className="bg-gray-50">
                    <tr className={STYLES.tableHeadRow}>
                      <th className={STYLES.tableHeader}>Role</th>
                      <th className={cn(STYLES.tableHeader, 'w-[140px] whitespace-nowrap')}>
                        Selected
                      </th>
                      <th className={cn(STYLES.tableHeader, 'w-[140px] whitespace-nowrap')}>
                        Primary
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ROLE_ORDER.map((role) => {
                      const assignment = roleAssignments.find((item) => item.role === role)
                      const selected = Boolean(assignment)
                      const isPrimaryRow = Boolean(
                        assignment?.isPrimary ||
                          (!roleAssignments.some((item) => item.isPrimary) && role === userRole)
                      )

                      return (
                        <tr key={role} className={STYLES.tableRow}>
                          <td className={STYLES.tableCell}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-medium text-gray-800 truncate">
                                {ROLE_LABELS[role]}
                              </span>
                              {assignment?.isPrimary && (
                                <span className={cn(STYLES.badge, STYLES.badgeInfo, 'py-0.5 px-2 shrink-0')}>
                                  Primary
                                </span>
                              )}
                            </div>
                          </td>
                          <td className={STYLES.tableCell}>
                            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                name="roles"
                                value={role}
                                defaultChecked={selected}
                                className="rounded border-gray-300"
                              />
                              <span className="text-xs text-gray-500">Include</span>
                            </label>
                          </td>
                          <td className={STYLES.tableCell}>
                            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="radio"
                                name="primaryRole"
                                value={role}
                                defaultChecked={isPrimaryRow}
                                className="border-gray-300"
                              />
                              <span className="text-xs text-gray-500">Set</span>
                            </label>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                {!isValidRole(userRole) ? (
                  <p className="text-xs text-amber-600">
                    Current primary role “{userRole}” is invalid — pick a valid role and save.
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">Choose roles, then select one primary.</p>
                )}
                <button type="submit" className={cn(STYLES.btn, STYLES.btnSecondary, 'w-full sm:w-auto')}>
                  <Save className="w-4 h-4" /> Save roles
                </button>
              </div>
            </div>
          </form>
        </div>
      </details>

      {roleAssignments.some((a) => a.role === 'VOLUNTEER') && (
        <div className="px-4 py-4 sm:px-5 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-700 mb-2">Volunteer review status</p>
          <div className="flex flex-wrap items-center gap-2">
            {(['PENDING_REVIEW', 'APPROVED', 'REQUEST_CORRECTIONS'] as const).map((status) => (
              <form
                key={status}
                action={async () => {
                  'use server'
                  const result = await updateVolunteerReviewStatus(userId, status)
                  if (result?.error) {
                    redirect(
                      `/admin/users/${canonicalIdentifier}?roleError=${encodeURIComponent(result.error)}`
                    )
                  }
                  redirect(
                    `/admin/users/${canonicalIdentifier}?roleMessage=${encodeURIComponent(`Volunteer review status set to ${status}`)}`
                  )
                }}
              >
                <button
                  type="submit"
                  className={cn(
                    'text-xs px-2.5 py-1.5 rounded border',
                    volunteerReviewStatus === status
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {status}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
