'use client'

import { useState } from 'react'
import { X, Calendar, Plus, Trash2, Loader2 } from 'lucide-react'
import { createMeetingRequest } from '@/app/actions/communication'

type Props = {
  staffId: string
  staffName: string
  isOpen: boolean
  onClose: () => void
}

export function MeetingRequestModal({ staffId, staffName, isOpen, onClose }: Props) {
  const [proposedDates, setProposedDates] = useState<string[]>([''])
  const [notes, setNotes] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  function addDate() {
    setProposedDates([...proposedDates, ''])
  }

  function removeDate(index: number) {
    setProposedDates(proposedDates.filter((_, i) => i !== index))
  }

  function updateDate(index: number, value: string) {
    const updated = [...proposedDates]
    updated[index] = value
    setProposedDates(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validDates = proposedDates.filter(d => d.trim())
    if (validDates.length === 0) {
      setError('Please select at least one date/time')
      return
    }

    setIsPending(true)
    setError(null)

    const result = await createMeetingRequest(staffId, validDates, notes)

    if (result.error) {
      setError(result.error)
      setIsPending(false)
    } else {
      setProposedDates([''])
      setNotes('')
      setIsPending(false)
      onClose()
      alert('Meeting request sent!')
    }
  }

  // Get minimum datetime (now)
  const minDateTime = new Date().toISOString().slice(0, 16)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Request Meeting with {staffName}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-500">
            Propose one or more times that work for you. The staff member will select their preferred time.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proposed Date/Times
            </label>
            <div className="space-y-2">
              {proposedDates.map((date, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={date}
                    onChange={(e) => updateDate(index, e.target.value)}
                    min={minDateTime}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required={index === 0}
                  />
                  {proposedDates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDate(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {proposedDates.length < 5 && (
              <button
                type="button"
                onClick={addDate}
                className="mt-2 flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
              >
                <Plus className="w-4 h-4" />
                Add another time option
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What would you like to discuss?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Calendar className="w-4 h-4" />
              )}
              Send Request
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
