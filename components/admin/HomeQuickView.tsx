'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  X, Building2, MapPin, Phone, User,
  AlertTriangle, Shield, Calendar, Edit3, Check,
  Loader2, ExternalLink, Clock
} from 'lucide-react'
import { getHomeDetails, updateHomeField } from '@/app/actions/home-management'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'

type HomeDetails = {
  id: string
  name: string
  address: string
  latitude: number | null
  longitude: number | null
  residentCount: number
  maxCapacity: number
  specialNeeds: string | null
  emergencyProtocol: string | null
  contactName: string
  contactEmail: string
  contactPhone: string
  contactPosition: string | null
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    name: string | null
    email: string
    phone: string | null
    status: string
    createdAt: Date
  }
  events: {
    id: string
    title: string
    startDateTime: Date
    status: string
  }[]
  _count: {
    events: number
  }
}

type EditableFieldProps = {
  label: string
  value: string | number | null
  field: string
  homeId: string
  type?: 'text' | 'number' | 'email' | 'textarea'
  onUpdate: () => void
}

function EditableField({ label, value, field, homeId, type = 'text', onUpdate }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(String(value || ''))
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    if (editValue === String(value || '')) {
      setIsEditing(false)
      return
    }

    startTransition(async () => {
      const finalValue = type === 'number' ? parseInt(editValue) : editValue
      const result = await updateHomeField(homeId, field, finalValue)
      if (result.success) {
        onUpdate()
      }
      setIsEditing(false)
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      handleSave()
    } else if (e.key === 'Escape') {
      setEditValue(String(value || ''))
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <div className="group">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</label>
        <div className="flex items-center gap-2 mt-1">
          {type === 'textarea' ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              autoFocus
              rows={3}
              className="flex-1 px-2 py-1 text-sm border border-primary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          ) : (
            <input
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              autoFocus
              className="flex-1 px-2 py-1 text-sm border border-primary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          )}
          {isPending ? (
            <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
          ) : (
            <button onClick={handleSave} className="p-1 text-green-600 hover:bg-green-50 rounded">
              <Check className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="group">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-2 mt-1">
        <span className={cn(
          "flex-1 text-sm text-gray-900",
          !value && "text-gray-400 italic"
        )}>
          {value || 'Not set'}
        </span>
        <button
          onClick={() => setIsEditing(true)}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-all"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

type HomeQuickViewProps = {
  homeId: string
  isOpen: boolean
  onClose: () => void
}

export function HomeQuickView({ homeId, isOpen, onClose }: HomeQuickViewProps) {
  const router = useRouter()
  const [home, setHome] = useState<HomeDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHome = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await getHomeDetails(homeId)
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setHome(result.data as HomeDetails)
    }
    setLoading(false)
  }, [homeId])

  useEffect(() => {
    if (isOpen && homeId) {
      fetchHome()
    }
  }, [isOpen, homeId, fetchHome])

  const handleUpdate = () => {
    fetchHome() // Refresh modal data after update
    router.refresh() // Refresh server components (list) to reflect changes
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden mx-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">{home?.name || 'Loading...'}</h2>
                <p className="text-primary-100 text-sm">Geriatric Home Details</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg">
              <p className="font-medium">Error loading home details</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          ) : home ? (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">{home.residentCount}</div>
                  <div className="text-xs text-blue-600 font-medium">Residents</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{home.maxCapacity}</div>
                  <div className="text-xs text-green-600 font-medium">Capacity</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-700">{home._count.events}</div>
                  <div className="text-xs text-purple-600 font-medium">Events</div>
                </div>
              </div>

              {/* Facility Information */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary-600" />
                  Facility Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <EditableField
                    label="Facility Name"
                    value={home.name}
                    field="name"
                    homeId={home.id}
                    onUpdate={handleUpdate}
                  />
                  <EditableField
                    label="Address"
                    value={home.address}
                    field="address"
                    homeId={home.id}
                    onUpdate={handleUpdate}
                  />
                  <EditableField
                    label="Resident Count"
                    value={home.residentCount}
                    field="residentCount"
                    homeId={home.id}
                    type="number"
                    onUpdate={handleUpdate}
                  />
                  <EditableField
                    label="Max Capacity"
                    value={home.maxCapacity}
                    field="maxCapacity"
                    homeId={home.id}
                    type="number"
                    onUpdate={handleUpdate}
                  />
                </div>
              </div>

              {/* Primary Contact */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary-600" />
                  Primary Contact
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <EditableField
                    label="Contact Name"
                    value={home.contactName}
                    field="contactName"
                    homeId={home.id}
                    onUpdate={handleUpdate}
                  />
                  <EditableField
                    label="Position"
                    value={home.contactPosition}
                    field="contactPosition"
                    homeId={home.id}
                    onUpdate={handleUpdate}
                  />
                  <EditableField
                    label="Email"
                    value={home.contactEmail}
                    field="contactEmail"
                    homeId={home.id}
                    type="email"
                    onUpdate={handleUpdate}
                  />
                  <EditableField
                    label="Phone"
                    value={home.contactPhone}
                    field="contactPhone"
                    homeId={home.id}
                    onUpdate={handleUpdate}
                  />
                </div>
              </div>

              {/* Admin Account */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary-600" />
                  Admin Account
                  <span className={cn(
                    "ml-auto px-2 py-0.5 rounded-full text-xs font-medium",
                    home.user.status === 'ACTIVE'
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  )}>
                    {home.user.status}
                  </span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <EditableField
                    label="Account Name"
                    value={home.user.name}
                    field="userName"
                    homeId={home.id}
                    onUpdate={handleUpdate}
                  />
                  <EditableField
                    label="Account Email"
                    value={home.user.email}
                    field="userEmail"
                    homeId={home.id}
                    type="email"
                    onUpdate={handleUpdate}
                  />
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-200">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Joined: {new Date(home.user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Special Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-amber-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-amber-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Special Needs
                  </h3>
                  <EditableField
                    label=""
                    value={home.specialNeeds}
                    field="specialNeeds"
                    homeId={home.id}
                    type="textarea"
                    onUpdate={handleUpdate}
                  />
                </div>
                <div className="bg-red-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-red-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-red-600" />
                    Emergency Protocol
                  </h3>
                  <EditableField
                    label=""
                    value={home.emergencyProtocol}
                    field="emergencyProtocol"
                    homeId={home.id}
                    type="textarea"
                    onUpdate={handleUpdate}
                  />
                </div>
              </div>

              {/* Recent Events */}
              {home.events.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary-600" />
                    Recent Events
                  </h3>
                  <div className="space-y-2">
                    {home.events.map(event => (
                      <a
                        key={event.id}
                        href={`/admin/events/${event.id}/edit`}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-white transition-colors group"
                      >
                        <div>
                          <div className="font-medium text-gray-900 text-sm group-hover:text-primary-600">
                            {event.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(event.startDateTime).toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium",
                          event.status === 'PUBLISHED' ? "bg-green-100 text-green-700" :
                          event.status === 'COMPLETED' ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-600"
                        )}>
                          {event.status}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <a
                  href={`/admin/homes/${home.id}`}
                  className={cn(STYLES.btn, STYLES.btnPrimary, "flex items-center gap-2")}
                >
                  <ExternalLink className="w-4 h-4" />
                  Full Details Page
                </a>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(home.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(STYLES.btn, "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-2")}
                >
                  <MapPin className="w-4 h-4" />
                  View on Map
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
