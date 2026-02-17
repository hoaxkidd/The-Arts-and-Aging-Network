'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete'

type Props = {
  userId: string
  userName: string | null
  userEmail: string
  action: (formData: FormData) => Promise<void>
}

export function CreateFacilityForm({ userId, userName, userEmail, action }: Props) {
  const [address, setAddress] = useState('')

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Facility Name *</label>
          <input name="name" required className={STYLES.input} placeholder="e.g., Sunrise Personal Care Home" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Max Capacity</label>
          <input name="maxCapacity" type="number" defaultValue="10" className={STYLES.input} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Address *</label>
          <AddressAutocomplete
            name="address"
            value={address}
            onChange={setAddress}
            placeholder="123 Main St, Winnipeg, MB"
            required
            countries={['ca']}
            className={STYLES.input}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Contact Name *</label>
          <input name="contactName" required defaultValue={userName || ''} className={STYLES.input} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Contact Email *</label>
          <input name="contactEmail" type="email" required defaultValue={userEmail} className={STYLES.input} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Contact Phone *</label>
          <input name="contactPhone" required className={STYLES.input} placeholder="(204) 555-0123" />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" className={cn(STYLES.btn, STYLES.btnPrimary, "text-sm")}>
          <Plus className="w-4 h-4" /> Create Facility
        </button>
      </div>
    </form>
  )
}
