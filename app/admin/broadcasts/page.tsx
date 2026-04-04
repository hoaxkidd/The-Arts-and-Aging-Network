'use client'

import { useState, useEffect } from 'react'
import { Plus, Send, Trash2, Loader2, X, Megaphone, ShieldCheck } from 'lucide-react'
import { createBroadcast, getBroadcasts, sendBroadcast, deleteBroadcast, approveBoardVisibilityForBroadcast } from '@/app/actions/broadcast-messages'
import { cn } from '@/lib/utils'

type Broadcast = {
  id: string
  title: string
  content: string
  status: string
  createdAt: Date
  sentAt: Date | null
  _count: {
    recipients: number
  }
}

export default function BroadcastMessagesPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    targetRoles: ['PAYROLL', 'HOME_ADMIN', 'FACILITATOR', 'VOLUNTEER', 'PARTNER'] as string[]
  })

  useEffect(() => {
    loadBroadcasts()
  }, [])

  async function loadBroadcasts() {
    setLoading(true)
    const result = await getBroadcasts()
    if (result.success && result.data) {
      setBroadcasts(result.data as Broadcast[])
    }
    setLoading(false)
  }

  async function handleCreate() {
    if (!formData.title.trim() || !formData.content.trim()) return

    setSaving(true)
    const result = await createBroadcast({
      title: formData.title,
      content: formData.content,
      targetRoles: formData.targetRoles
    })
    
    if (!result.error) {
      loadBroadcasts()
      closeForm()
    } else {
      alert(result.error)
    }
    
    setSaving(false)
  }

  async function handleSend(id: string) {
    if (!confirm('Send this broadcast now?')) return
    
    setActionId(id)
    const result = await sendBroadcast(id)
    if (!result.error) {
      loadBroadcasts()
    } else {
      alert(result.error)
    }
    setActionId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this broadcast?')) return
    
    setActionId(id)
    const result = await deleteBroadcast(id)
    if (!result.error) {
      loadBroadcasts()
    } else {
      alert(result.error)
    }
    setActionId(null)
  }

  async function handleApproveBoard(id: string) {
    if (!confirm('Approve this broadcast for board visibility?')) return

    setActionId(id)
    const result = await approveBoardVisibilityForBroadcast(id)
    if (!result.error) {
      loadBroadcasts()
    } else {
      alert(result.error)
    }
    setActionId(null)
  }

  function closeForm() {
    setShowForm(false)
    setFormData({ title: '', content: '', targetRoles: ['PAYROLL', 'HOME_ADMIN', 'FACILITATOR', 'VOLUNTEER', 'PARTNER'] })
  }

  function toggleRole(role: string) {
    setFormData((prev) => {
      const hasRole = prev.targetRoles.includes(role)
      const targetRoles = hasRole
        ? prev.targetRoles.filter((r) => r !== role)
        : [...prev.targetRoles, role]
      return { ...prev, targetRoles }
    })
  }

  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
        >
          <Plus className="w-4 h-4" />
          New Broadcast
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Megaphone className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">No broadcasts yet</h3>
            <p className="text-xs text-gray-500">Create a broadcast to message all users at once</p>
          </div>
        ) : (
          <div className="space-y-3">
            {broadcasts.map((broadcast) => (
              <div
                key={broadcast.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-gray-900">{broadcast.title}</h3>
                        <span className={cn(
                          "px-2 py-0.5 text-xs rounded-full",
                          broadcast.status === 'PENDING' && "bg-yellow-100 text-yellow-700",
                          broadcast.status === 'SENT' && "bg-green-100 text-green-700",
                          broadcast.status === 'PENDING_BOARD_APPROVAL' && "bg-amber-100 text-amber-800"
                        )}>
                          {broadcast.status}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{broadcast.content}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {broadcast.status === 'SENT' ? `Sent ${formatDate(broadcast.sentAt!)}` : `Created ${formatDate(broadcast.createdAt)}`} • {broadcast._count.recipients} recipients
                    </p>
                  </div>

                    <div className="flex items-center gap-1">
                      {broadcast.status === 'PENDING_BOARD_APPROVAL' && (
                        <button
                          onClick={() => handleApproveBoard(broadcast.id)}
                          disabled={actionId === broadcast.id}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-amber-700 hover:bg-amber-50 rounded-lg disabled:opacity-50"
                          title="Approve board visibility"
                        >
                          {actionId === broadcast.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ShieldCheck className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      {broadcast.status === 'PENDING' && (
                        <button
                          onClick={() => handleSend(broadcast.id)}
                        disabled={actionId === broadcast.id}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                        title="Send now"
                      >
                        {actionId === broadcast.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(broadcast.id)}
                      disabled={actionId === broadcast.id}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Broadcast</h2>
              <button
                onClick={closeForm}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g., Important Announcement"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Message</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(f => ({ ...f, content: e.target.value }))}
                  placeholder="Your message to all users..."
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Audience</label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {['PAYROLL', 'HOME_ADMIN', 'FACILITATOR', 'VOLUNTEER', 'PARTNER', 'BOARD'].map((role) => (
                    <label key={role} className="inline-flex items-center gap-2 rounded border border-gray-200 px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={formData.targetRoles.includes(role)}
                        onChange={() => toggleRole(role)}
                        className="rounded border-gray-300"
                      />
                      <span>{role.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
                {formData.targetRoles.includes('BOARD') && (
                  <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                    Board recipients require ED/Chair approval before this broadcast can be sent.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
              <button
                onClick={closeForm}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!formData.title.trim() || !formData.content.trim() || saving}
                className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Create & Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
