'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createMessageGroup } from '@/app/actions/messaging'
import { cn } from '@/lib/utils'

type Staff = {
  id: string
  name: string | null
  preferredName: string | null
  email: string | null
  role: string
  image: string | null
}

type Event = {
  id: string
  title: string
  startDateTime: Date
}

type CreateGroupFormProps = {
  staff: Staff[]
  events: Event[]
}

const GROUP_TYPES = [
  { value: 'CUSTOM', label: 'Custom Group', description: 'Manually select members' },
  { value: 'ROLE_BASED', label: 'Role-Based', description: 'Group by staff role' },
  { value: 'EVENT_BASED', label: 'Event-Based', description: 'Linked to a specific event' }
]

const COLORS = [
  { value: 'blue', label: 'Blue', active: 'bg-blue-600 text-white ring-2 ring-blue-500 ring-offset-2', inactive: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  { value: 'green', label: 'Green', active: 'bg-green-600 text-white ring-2 ring-green-500 ring-offset-2', inactive: 'bg-green-100 text-green-700 hover:bg-green-200' },
  { value: 'purple', label: 'Purple', active: 'bg-purple-600 text-white ring-2 ring-purple-500 ring-offset-2', inactive: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
  { value: 'red', label: 'Red', active: 'bg-red-600 text-white ring-2 ring-red-500 ring-offset-2', inactive: 'bg-red-100 text-red-700 hover:bg-red-200' },
  { value: 'yellow', label: 'Yellow', active: 'bg-yellow-500 text-white ring-2 ring-yellow-500 ring-offset-2', inactive: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
  { value: 'pink', label: 'Pink', active: 'bg-pink-600 text-white ring-2 ring-pink-500 ring-offset-2', inactive: 'bg-pink-100 text-pink-700 hover:bg-pink-200' }
]

const EMOJIS = ['💬', '👥', '📢', '🎯', '⭐', '🎨', '🎭', '🎪', '🎵', '📚', '🏆', '💡']

export function CreateGroupForm({ staff, events }: CreateGroupFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'CUSTOM',
    iconEmoji: '💬',
    color: 'blue',
    eventId: '',
    allowAllStaff: false,
    initialMembers: [] as string[]
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await createMessageGroup(formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push('/admin/messaging')
    }
  }

  const toggleMember = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      initialMembers: prev.initialMembers.includes(userId)
        ? prev.initialMembers.filter(id => id !== userId)
        : [...prev.initialMembers, userId]
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl w-full">
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200 shadow-sm">
        {/* Basic Info */}
        <div className="p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>

          <div>
            <label htmlFor="group-name" className="block text-sm font-medium text-gray-700 mb-1">
              Group Name <span className="text-red-500">*</span>
            </label>
            <input
              id="group-name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., Event Coordinators"
            />
          </div>

          <div>
            <label htmlFor="group-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="group-description"
              name="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="What is this group for?"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icon
              </label>
              <div className="grid grid-cols-6 gap-2">
                {EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, iconEmoji: emoji }))}
                    className={cn(
                      "min-w-[44px] min-h-[44px] sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-2xl transition-colors touch-manipulation",
                      formData.iconEmoji === emoji
                        ? "bg-primary-100 ring-2 ring-primary-500 ring-offset-2"
                        : "bg-gray-100 hover:bg-gray-200"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="grid grid-cols-3 gap-2">
                {COLORS.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                    className={cn(
                      "min-h-[44px] sm:min-h-0 px-3 py-2.5 sm:py-2 rounded-lg text-xs font-medium transition-colors touch-manipulation",
                      formData.color === color.value ? color.active : color.inactive
                    )}
                  >
                    {color.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Group Type */}
        <div className="p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Group Type</h2>

          <div className="space-y-3">
            {GROUP_TYPES.map(type => (
              <label
                key={type.value}
                className={cn(
                  "flex items-start gap-3 p-4 sm:p-5 min-h-[56px] border-2 rounded-xl cursor-pointer transition-colors touch-manipulation",
                  formData.type === type.value
                    ? "border-primary-500 bg-primary-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="radio"
                  name="type"
                  value={type.value}
                  checked={formData.type === type.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="mt-1.5 w-4 h-4"
                />
                <div>
                  <p className="font-medium text-gray-900">{type.label}</p>
                  <p className="text-sm text-gray-600">{type.description}</p>
                </div>
              </label>
            ))}
          </div>

          {formData.type === 'EVENT_BASED' && (
            <div>
              <label htmlFor="group-event" className="block text-sm font-medium text-gray-700 mb-1">
                Select Event
              </label>
              <select
                id="group-event"
                name="eventId"
                value={formData.eventId}
                onChange={(e) => setFormData(prev => ({ ...prev, eventId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Choose an event...</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.title} - {new Date(event.startDateTime).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Access Settings */}
        <div className="p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Access Settings</h2>

          <label htmlFor="allow-all-staff" className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              id="allow-all-staff"
              name="allowAllStaff"
              type="checkbox"
              checked={formData.allowAllStaff}
              onChange={(e) => setFormData(prev => ({ ...prev, allowAllStaff: e.target.checked }))}
              className="mt-1"
            />
            <div>
              <p className="font-medium text-gray-900">Allow All Staff</p>
              <p className="text-sm text-gray-600">
                Staff members can join automatically without admin approval
              </p>
            </div>
          </label>
        </div>

        {/* Initial Members */}
        {!formData.allowAllStaff && (
          <div className="p-4 sm:p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Initial Members</h2>
            <p className="text-sm text-gray-600">Select staff to add to this group</p>

            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
              {staff.map(member => (
                <label
                  key={member.id}
                  htmlFor={`member-${member.id}`}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                >
                  <input
                    id={`member-${member.id}`}
                    name="initialMembers"
                    type="checkbox"
                    value={member.id}
                    checked={formData.initialMembers.includes(member.id)}
                    onChange={() => toggleMember(member.id)}
                  />
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-medium">
                    {member.name?.[0] || 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {member.preferredName || member.name}
                    </p>
                    <p className="text-xs text-gray-500">{member.email || 'No email'}</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                    {member.role}
                  </span>
                </label>
              ))}
            </div>

            <p className="text-sm text-gray-600">
              {formData.initialMembers.length} member(s) selected
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 min-h-[48px] bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium touch-manipulation"
        >
          {loading ? 'Creating...' : 'Create Group'}
        </button>
        <Link
          href="/admin/messaging"
          className="px-6 py-3 min-h-[48px] flex items-center justify-center text-gray-700 hover:text-gray-900 rounded-lg border border-gray-300 hover:bg-gray-50 touch-manipulation"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
