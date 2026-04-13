'use client'

import { useEffect, useState, useTransition } from 'react'
import { updateStaffProfile } from '@/app/actions/staff'
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete'
import { DateInput } from '@/components/ui/DateInput'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { toInputDate } from '@/lib/date-utils'
import { STYLES } from '@/lib/styles'

type ProgramCoordinatorUser = {
  id: string
  name: string | null
  preferredName: string | null
  pronouns: string | null
  phone: string | null
  address: string | null
  birthDate: Date | null
}

export function ProgramCoordinatorProfileForm({ user }: { user: ProgramCoordinatorUser }) {
  const [isPending, startTransition] = useTransition()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [address, setAddress] = useState(user.address || '')
  const commonPronouns = ['She/Her', 'He/Him', 'They/Them']
  const isCustomPronouns = Boolean(user.pronouns && !commonPronouns.includes(user.pronouns))
  const [showCustomPronouns, setShowCustomPronouns] = useState(isCustomPronouns)

  useEffect(() => {
    setAddress(user.address || '')
  }, [user.address])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatusMessage(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await updateStaffProfile(formData)
      if (result?.error) {
        setStatusMessage(result.error)
      } else {
        setStatusMessage((result as any)?.message || 'Profile saved.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="userId" value={user.id} />

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
        <p className="text-sm font-medium text-blue-900">Program Coordinator Onboarding</p>
        <p className="text-xs text-blue-700 mt-1">
          Keep your personal contact details current so booking confirmations and office communication reach the right person.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Legal Name</label>
            <input
              name="name"
              defaultValue={user.name || ''}
              disabled
              className="w-full rounded-lg border-gray-300 bg-gray-50 text-gray-500 px-3 py-2"
            />
            <p className="text-xs text-gray-400 mt-1">Contact the admin to update your legal name.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Name</label>
            <input
              name="preferredName"
              defaultValue={user.preferredName || ''}
              className={STYLES.input}
              placeholder="How should we address you?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pronouns</label>
            <select
              name="pronouns"
              defaultValue={isCustomPronouns ? 'Other' : (user.pronouns || '')}
              className={STYLES.input}
              onChange={(e) => setShowCustomPronouns(e.target.value === 'Other')}
            >
              <option value="">Prefer not to say</option>
              <option value="She/Her">She/Her</option>
              <option value="He/Him">He/Him</option>
              <option value="They/Them">They/Them</option>
              <option value="Other">Other</option>
            </select>
            {showCustomPronouns && (
              <input
                name="pronouns_other"
                defaultValue={isCustomPronouns ? (user.pronouns || '') : ''}
                placeholder="Enter your pronouns"
                className={`${STYLES.input} mt-2`}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <PhoneInput name="phone" defaultValue={user.phone || ''} className="border px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <DateInput name="birthDate" value={user.birthDate ? toInputDate(user.birthDate) : ''} />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <AddressAutocomplete
              name="address"
              value={address}
              onChange={setAddress}
              placeholder="Full mailing address"
              countries={['ca']}
              className="w-full rounded-lg border-gray-300"
            />
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="text-sm text-gray-600">{statusMessage}</div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </form>
  )
}
