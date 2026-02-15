'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createMessageGroup } from '@/app/actions/messaging'
import { Users, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

type Staff = {
  id: string
  name: string | null
  preferredName: string | null
  email: string
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
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'purple', label: 'Purple' },
  { value: 'red', label: 'Red' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'pink', label: 'Pink' }
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
    <form onSubmit={handleSubmit} className="max-w-3xl">
      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
        {/* Basic Info */}
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., Event Coordinators"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="What is this group for?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                      "w-10 h-10 rounded-lg flex items-center justify-center text-2xl transition-colors",
                      formData.iconEmoji === emoji
                        ? "bg-primary-100 ring-2 ring-primary-500"
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
                      "px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                      `bg-${color.value}-100 text-${color.value}-700`,
                      formData.color === color.value && "ring-2 ring-offset-2",
                      formData.color === color.value && `ring-${color.value}-500`
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
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Group Type</h2>

          <div className="space-y-3">
            {GROUP_TYPES.map(type => (
              <label
                key={type.value}
                className={cn(
                  "flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors",
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
                  className="mt-1"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Event
              </label>
              <select
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
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Access Settings</h2>

          <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
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
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Initial Members</h2>
            <p className="text-sm text-gray-600">Select staff to add to this group</p>

            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
              {staff.map(member => (
                <label
                  key={member.id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                >
                  <input
                    type="checkbox"
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
                    <p className="text-xs text-gray-500">{member.email}</p>
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
      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Creating...' : 'Create Group'}
        </button>
        <Link
          href="/admin/messaging"
          className="px-4 py-2 text-gray-700 hover:text-gray-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
