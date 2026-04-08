import { redirect } from 'next/navigation'
import { Briefcase, Save } from 'lucide-react'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { updateUserEmployment } from '@/app/actions/user'

type Props = {
  userId: string
  canonicalIdentifier: string
  user: {
    position: string | null
    employmentType: string | null
    employmentStatus: string | null
    region: string | null
    startDate: Date | null
  }
}

export function AdminUserEmploymentForm({ userId, canonicalIdentifier, user }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className={STYLES.cardHeader}>
        <div className={STYLES.cardTitle}>
          <Briefcase className="w-4 h-4 text-gray-500 shrink-0" />
          Employment details
        </div>
      </div>
      <form
        action={async (formData) => {
          'use server'
          const result = await updateUserEmployment(userId, formData)
          if (result?.error) {
            redirect(
              `/admin/users/${canonicalIdentifier}?employmentError=${encodeURIComponent(result.error)}`
            )
          }
          redirect(
            `/admin/users/${canonicalIdentifier}?employmentMessage=${encodeURIComponent('Employment details saved')}`
          )
        }}
        className="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 min-w-0">
            <label className="text-xs font-medium text-gray-600">Position</label>
            <input
              name="position"
              defaultValue={user.position || ''}
              className={cn(STYLES.input, 'mt-1')}
              placeholder="e.g. Facilitator"
            />
          </div>
          <div className="min-w-0">
            <label className="text-xs font-medium text-gray-600">Employment type</label>
            <select
              name="employmentType"
              defaultValue={user.employmentType || ''}
              className={cn(STYLES.input, STYLES.select, 'mt-1')}
            >
              <option value="">Unspecified</option>
              <option value="FULL_TIME">Full time</option>
              <option value="PART_TIME">Part time</option>
              <option value="CASUAL">Casual</option>
              <option value="VOLUNTEER">Volunteer</option>
              <option value="CONTRACTOR">Contractor</option>
            </select>
          </div>
          <div className="min-w-0">
            <label className="text-xs font-medium text-gray-600">Employment status</label>
            <select
              name="employmentStatus"
              defaultValue={user.employmentStatus || ''}
              className={cn(STYLES.input, STYLES.select, 'mt-1')}
            >
              <option value="">Unspecified</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On leave</option>
              <option value="CONTRACT">Contract</option>
              <option value="SEASONAL">Seasonal</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>
          <div className="min-w-0">
            <label className="text-xs font-medium text-gray-600">Region</label>
            <input
              name="region"
              defaultValue={user.region || ''}
              className={cn(STYLES.input, 'mt-1')}
              placeholder="e.g. Eastern"
            />
          </div>
          <div className="min-w-0">
            <label className="text-xs font-medium text-gray-600">Start date</label>
            <input
              type="date"
              name="startDate"
              defaultValue={
                user.startDate ? new Date(user.startDate).toISOString().split('T')[0] : ''
              }
              className={cn(STYLES.input, 'mt-1')}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" className={cn(STYLES.btn, STYLES.btnSecondary, 'w-full sm:w-auto')}>
            <Save className="w-4 h-4" /> Save employment
          </button>
        </div>
      </form>
    </div>
  )
}
