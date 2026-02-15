'use client'

import { useState } from 'react'
import { MapPin, Loader2, Plus } from 'lucide-react'
import { submitMileageEntry } from '@/app/actions/mileage'

const FUNDING_CLASSES = ['GRANT_A', 'GRANT_B', 'OPERATIONAL', 'VOLUNTEER', 'OTHER']

type Props = {
  onSuccess?: () => void
}

export function MileageEntryForm({ onSuccess }: Props) {
  const [isPending, setIsPending] = useState(false)
  const [showForm, setShowForm] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      date: formData.get('date') as string,
      startLocation: formData.get('startLocation') as string,
      endLocation: formData.get('endLocation') as string,
      kilometers: parseFloat(formData.get('kilometers') as string) || 0,
      fundingClass: formData.get('fundingClass') as string || undefined,
      purpose: formData.get('purpose') as string || undefined
    }

    if (!data.date || !data.startLocation || !data.endLocation || data.kilometers <= 0) {
      alert('Please fill in all required fields')
      setIsPending(false)
      return
    }

    const result = await submitMileageEntry(data)

    if (result.error) {
      alert(result.error)
    } else {
      setShowForm(false)
      onSuccess?.()
    }

    setIsPending(false)
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Mileage Entry
      </button>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
          <MapPin className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">New Mileage Entry</h3>
          <p className="text-sm text-gray-500">Log a trip for reimbursement</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="date"
              defaultValue={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Distance (km) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="kilometers"
              step="0.1"
              min="0"
              placeholder="0.0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="startLocation"
              placeholder="e.g., Office, Home"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="endLocation"
              placeholder="e.g., Sunrise Manor"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Funding Class
            </label>
            <select
              name="fundingClass"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select...</option>
              {FUNDING_CLASSES.map(fc => (
                <option key={fc} value={fc}>{fc}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purpose / Notes
            </label>
            <input
              type="text"
              name="purpose"
              placeholder="e.g., Client visit, Event setup"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Entry
          </button>
        </div>
      </form>
    </div>
  )
}
