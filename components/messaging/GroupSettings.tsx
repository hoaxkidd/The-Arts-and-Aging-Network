'use client'

import { useState } from 'react'
import { Settings, Trash2, Archive } from 'lucide-react'
import { updateMessageGroup, deleteMessageGroup } from '@/app/actions/messaging'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

type Group = {
  id: string
  name: string
  description: string | null
  allowAllStaff: boolean
  isActive: boolean
}

export function GroupSettings({ group }: { group: Group }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: group.name,
    description: group.description || '',
    allowAllStaff: group.allowAllStaff
  })

  const handleUpdate = async () => {
    setLoading(true)
    await updateMessageGroup(group.id, formData)
    setLoading(false)
    setEditing(false)
  }

  const handleArchive = async () => {
    if (!confirm('Archive this group? Members will no longer be able to send messages.')) return
    setLoading(true)
    await updateMessageGroup(group.id, { isActive: false })
    router.push('/admin/messaging')
  }

  const handleDelete = async () => {
    if (!confirm('Delete this group permanently? This action cannot be undone.')) return
    setLoading(true)
    await deleteMessageGroup(group.id)
    router.push('/admin/messaging')
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
        <Settings className="w-4 h-4 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Group Settings</h3>
      </div>

      <div className="p-4 space-y-4">
        {editing ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={formData.allowAllStaff}
                onChange={(e) => setFormData(prev => ({ ...prev, allowAllStaff: e.target.checked }))}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">Allow All Staff</p>
                <p className="text-xs text-gray-600">
                  Staff can join automatically without approval
                </p>
              </div>
            </label>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleUpdate}
                disabled={loading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => {
                  setEditing(false)
                  setFormData({
                    name: group.name,
                    description: group.description || '',
                    allowAllStaff: group.allowAllStaff
                  })
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 text-sm"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase">Access</p>
                <p className="text-sm text-gray-900">
                  {group.allowAllStaff ? 'Open to all staff' : 'Invite only'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Status</p>
                <p className="text-sm text-gray-900">
                  {group.isActive ? 'Active' : 'Archived'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setEditing(true)}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
            >
              Edit Settings
            </button>
          </>
        )}

        {/* Danger Zone */}
        <div className="pt-4 border-t border-gray-200 space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase">Danger Zone</p>

          <button
            onClick={handleArchive}
            disabled={loading || !group.isActive}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 disabled:opacity-50 text-sm font-medium"
          >
            <Archive className="w-4 h-4" />
            Archive Group
          </button>

          <button
            onClick={handleDelete}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50 text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Delete Group
          </button>
        </div>
      </div>
    </div>
  )
}
