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
import { SendHomeInvitationButton } from './SendHomeInvitationButton'

type HomeDetails = {
  id: string
  name: string
  address: string
  latitude: number | null
  longitude: number | null
  residentCount: number
  maxCapacity: number
  type?: string | null
  region?: string | null
  specialNeeds: string | null
  emergencyProtocol: string | null
  contactName: string
  contactEmail: string
  contactPhone: string
  contactPosition: string | null
  useCustomNotificationEmail?: boolean
  notificationEmail?: string | null
  secondaryContact?: string | null
  additionalContacts?: string | null
  flags?: string | null
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    name: string | null
    email: string
    phone: string | null
    address: string | null
    emergencyContact: string | null
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

type HomeFlags = {
  cityProvince?: string | null
  postalCode?: string | null
  contacted?: boolean
  raw?: string | null
  secondEmailPhone?: string | null
}

type SecondaryContact = { id?: string; name?: string; email?: string; phone?: string; position?: string }

type EditableFieldProps = {
  label: string
  value: string | number | null
  field: string
  homeId: string
  type?: 'text' | 'number' | 'email' | 'textarea'
  onUpdate: () => void
  hideLabel?: boolean
}

function EditableField({ label, value, field, homeId, type = 'text', onUpdate, hideLabel }: EditableFieldProps) {
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
    const isTextarea = type === 'textarea'
    return (
      <div className={isTextarea ? "block space-y-2" : "group"}>
        {label && <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</label>}
        <div className={cn("flex gap-2 mt-1", isTextarea && "flex-col items-stretch")}>
          {isTextarea ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              autoFocus
              rows={4}
              className="w-full min-h-[80px] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y"
            />
          ) : (
            <input
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              autoFocus
              className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          )}
          {isTextarea ? (
            <div className="flex justify-end">
              {isPending ? <Loader2 className="w-4 h-4 text-primary-500 animate-spin" /> : (
                <button type="button" onClick={handleSave} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"><Check className="w-3.5 h-3.5" /> Save</button>
              )}
            </div>
          ) : (
            isPending ? <Loader2 className="w-4 h-4 text-primary-500 animate-spin shrink-0" /> : (
              <button type="button" onClick={handleSave} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg shrink-0" aria-label="Save"><Check className="w-4 h-4" /></button>
            )
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("group flex gap-2", type === 'textarea' ? "flex-col items-stretch" : "items-center")}>
      {!hideLabel && (
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider shrink-0">{label}</label>
      )}
      <div className={cn("flex items-center gap-2 min-w-0 flex-1", type === 'textarea' && "flex-col items-stretch")}>
        <span className={cn(
          "text-sm text-gray-900",
          type === 'textarea' && "whitespace-pre-line rounded-md bg-gray-50 px-3 py-2 border border-gray-100",
          !value && "text-gray-400 italic"
        )}>
          {value ?? 'Not set'}
        </span>
        <button
          onClick={() => setIsEditing(true)}
          className={cn(
            "p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-all",
            hideLabel ? "" : "opacity-0 group-hover:opacity-100"
          )}
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

type QuickViewTab = 'facility' | 'contact' | 'account' | 'protocol' | 'events'

export function HomeQuickView({ homeId, isOpen, onClose }: HomeQuickViewProps) {
  const router = useRouter()
  const [home, setHome] = useState<HomeDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<QuickViewTab>('facility')
  const [isNotificationPending, startNotificationTransition] = useTransition()

  const parsedFlags: HomeFlags = (() => {
    if (!home?.flags) return {}
    try {
      return JSON.parse(home.flags) as HomeFlags
    } catch {
      return {}
    }
  })()

  const parsedAdditionalContacts: SecondaryContact[] = (() => {
    if (!home?.additionalContacts) return []
    try {
      const parsed = JSON.parse(home.additionalContacts) as SecondaryContact[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })()

  const secondaryContact = home?.secondaryContact || parsedAdditionalContacts[0]?.name || null
  const secondEmailPhone = parsedFlags.secondEmailPhone || parsedAdditionalContacts[0]?.email || parsedAdditionalContacts[0]?.phone || null

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
      setActiveTab('facility')
      fetchHome()
    }
  }, [isOpen, homeId, fetchHome])

  const handleUpdate = () => {
    fetchHome() // Refresh modal data after update
    router.refresh() // Refresh server components (list) to reflect changes
  }

  const handleToggleNotificationOverride = (checked: boolean) => {
    if (!home) return
    startNotificationTransition(async () => {
      await updateHomeField(home.id, 'useCustomNotificationEmail', checked ? 'true' : 'false')
      handleUpdate()
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl border border-gray-200 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header with summary */}
        <div className="border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white">
          <div className="flex items-start justify-between gap-4 px-6 py-5">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center shadow-sm shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-gray-900 truncate">{home?.name || 'Loading...'}</h2>
                <p className="text-sm text-gray-500 mt-0.5">Facility · Quick view & edit</p>
                {home && (
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Updated {new Date(home.updatedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className={cn(STYLES.btnIcon, "rounded-lg shrink-0")}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Key metrics strip */}
          {home && (
            <div className="px-6 pb-4 flex flex-wrap gap-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-primary-600 tabular-nums">{home.residentCount}</span>
                <span className="text-sm text-gray-500">residents</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-gray-800 tabular-nums">{home.maxCapacity}</span>
                <span className="text-sm text-gray-500">capacity</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-gray-800 tabular-nums">{home._count.events}</span>
                <span className="text-sm text-gray-500">bookings</span>
              </div>
              {home.type && (
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">{home.type}</span>
              )}
              {home.region && (
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">{home.region}</span>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-hidden flex flex-col max-h-[calc(90vh-72px)]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
              </div>
              <p className="text-sm text-gray-500">Loading facility details…</p>
            </div>
          ) : error ? (
            <div className="m-5 p-5 rounded-xl border border-red-200 bg-red-50/80">
              <p className="font-semibold text-red-800">Couldn’t load facility</p>
              <p className="text-sm mt-1 text-red-700">{error}</p>
            </div>
          ) : home ? (
            <>
              {/* Tabs */}
              <div className="flex border-b border-gray-200 bg-white px-5 gap-0.5 overflow-x-auto shrink-0">
                {(['facility', 'contact', 'account', 'protocol', 'events'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-150 rounded-t-lg -mb-px",
                      activeTab === tab
                        ? "border-primary-500 text-primary-600 bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.04)]"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/80"
                    )}
                  >
                    {tab === 'facility' && <><Building2 className="w-4 h-4 inline-block mr-2 align-middle opacity-80" /> Facility</>}
                    {tab === 'contact' && <><Phone className="w-4 h-4 inline-block mr-2 align-middle opacity-80" /> Contact</>}
                    {tab === 'account' && <><User className="w-4 h-4 inline-block mr-2 align-middle opacity-80" /> Account</>}
                    {tab === 'protocol' && <><Shield className="w-4 h-4 inline-block mr-2 align-middle opacity-80" /> Protocol</>}
                    {tab === 'events' && <><Calendar className="w-4 h-4 inline-block mr-2 align-middle opacity-80" /> Bookings</>}
                  </button>
                ))}
              </div>

              <div className="overflow-y-auto flex-1 p-5 bg-gray-50/30">
                {/* Facility tab */}
                {activeTab === 'facility' && (
                  <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                      <h3 className="text-sm font-semibold text-gray-700">Facility information</h3>
                    </div>
                    <table className={STYLES.table}>
                      <tbody className="divide-y divide-gray-100">
                        <tr className="hover:bg-gray-50/50 transition-colors"><td className="w-[38%] py-3 px-4 text-sm font-medium text-gray-600">Facility name</td><td className="py-3 px-4"><EditableField label="" value={home.name} field="name" homeId={home.id} onUpdate={handleUpdate} hideLabel /></td></tr>
                        <tr className="hover:bg-gray-50/50 transition-colors"><td className="py-3 px-4 text-sm font-medium text-gray-600">Address</td><td className="py-3 px-4"><EditableField label="" value={home.address} field="address" homeId={home.id} onUpdate={handleUpdate} hideLabel /></td></tr>
                        {(home.type || home.region || parsedFlags.cityProvince || parsedFlags.postalCode || parsedFlags.raw || typeof parsedFlags.contacted === 'boolean') && (
                          <>
                            {home.type && <tr className="hover:bg-gray-50/50 transition-colors"><td className="py-3 px-4 text-sm font-medium text-gray-600">Type</td><td className="py-3 px-4 text-sm text-gray-900">{home.type}</td></tr>}
                            {home.region && <tr className="hover:bg-gray-50/50 transition-colors"><td className="py-3 px-4 text-sm font-medium text-gray-600">Region</td><td className="py-3 px-4 text-sm text-gray-900">{home.region}</td></tr>}
                            {(parsedFlags.cityProvince || parsedFlags.postalCode) && (
                              <>
                                {parsedFlags.cityProvince && <tr className="hover:bg-gray-50/50 transition-colors"><td className="py-3 px-4 text-sm font-medium text-gray-600">City, Province</td><td className="py-3 px-4 text-sm text-gray-900">{parsedFlags.cityProvince}</td></tr>}
                                {parsedFlags.postalCode && <tr className="hover:bg-gray-50/50 transition-colors"><td className="py-3 px-4 text-sm font-medium text-gray-600">Postal Code</td><td className="py-3 px-4 text-sm text-gray-900">{parsedFlags.postalCode}</td></tr>}
                              </>
                            )}
                            {(parsedFlags.raw || typeof parsedFlags.contacted === 'boolean') && (
                              <tr className="hover:bg-gray-50/50 transition-colors"><td className="py-3 px-4 text-sm font-medium text-gray-600">Contacted</td><td className="py-3 px-4 text-sm text-gray-900">{parsedFlags.raw || (parsedFlags.contacted ? 'Yes' : 'No')}</td></tr>
                            )}
                          </>
                        )}
                        <tr className="hover:bg-gray-50/50 transition-colors"><td className="py-3 px-4 text-sm font-medium text-gray-600">Resident count</td><td className="py-3 px-4"><EditableField label="" value={home.residentCount} field="residentCount" homeId={home.id} type="number" onUpdate={handleUpdate} hideLabel /></td></tr>
                        <tr className="hover:bg-gray-50/50 transition-colors"><td className="py-3 px-4 text-sm font-medium text-gray-600">Max capacity</td><td className="py-3 px-4"><EditableField label="" value={home.maxCapacity} field="maxCapacity" homeId={home.id} type="number" onUpdate={handleUpdate} hideLabel /></td></tr>
                        <tr className="hover:bg-gray-50/50 transition-colors"><td className="py-3 px-4 text-sm font-medium text-gray-600">Bookings (total)</td><td className="py-3 px-4 text-sm text-gray-900">{home._count.events}</td></tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Contact tab */}
                {activeTab === 'contact' && (
                  <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                      <h3 className="text-sm font-semibold text-gray-700">Primary contact</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Main point of contact for this facility</p>
                    </div>
                    <table className={STYLES.table}>
                      <tbody className="divide-y divide-gray-100">
                        <tr className="hover:bg-gray-50/50 transition-colors"><td className="w-[38%] py-3 px-4 text-sm font-medium text-gray-600">Name</td><td className="py-3 px-4"><EditableField label="" value={home.contactName} field="contactName" homeId={home.id} onUpdate={handleUpdate} hideLabel /></td></tr>
                        <tr className="hover:bg-gray-50/50 transition-colors"><td className="py-3 px-4 text-sm font-medium text-gray-600">Position</td><td className="py-3 px-4"><EditableField label="" value={home.contactPosition} field="contactPosition" homeId={home.id} onUpdate={handleUpdate} hideLabel /></td></tr>
                        <tr className="hover:bg-gray-50/50 transition-colors"><td className="py-3 px-4 text-sm font-medium text-gray-600">Email</td><td className="py-3 px-4"><EditableField label="" value={home.contactEmail} field="contactEmail" homeId={home.id} type="email" onUpdate={handleUpdate} hideLabel /></td></tr>
                        <tr className="hover:bg-gray-50/50 transition-colors"><td className="py-3 px-4 text-sm font-medium text-gray-600">Phone</td><td className="py-3 px-4"><EditableField label="" value={home.contactPhone} field="contactPhone" homeId={home.id} onUpdate={handleUpdate} hideLabel /></td></tr>
                        <tr className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4 text-sm font-medium text-gray-600">Custom notification email</td>
                          <td className="py-3 px-4">
                            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={Boolean(home.useCustomNotificationEmail)}
                                onChange={(e) => handleToggleNotificationOverride(e.target.checked)}
                                disabled={isNotificationPending}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              {isNotificationPending ? 'Updating...' : 'Use custom email for notifications'}
                            </label>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50/50 transition-colors"><td className="py-3 px-4 text-sm font-medium text-gray-600">Notification email</td><td className="py-3 px-4"><EditableField label="" value={home.notificationEmail ?? null} field="notificationEmail" homeId={home.id} type="email" onUpdate={handleUpdate} hideLabel /></td></tr>
                        <tr className="hover:bg-gray-50/50 transition-colors"><td className="py-3 px-4 text-sm font-medium text-gray-600">2nd Contact</td><td className="py-3 px-4 text-sm text-gray-900">{secondaryContact || '—'}</td></tr>
                        <tr className="hover:bg-gray-50/50 transition-colors"><td className="py-3 px-4 text-sm font-medium text-gray-600">2nd Email/Phone</td><td className="py-3 px-4 text-sm text-gray-900">{secondEmailPhone || '—'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Account tab */}
                {activeTab === 'account' && (
                  <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                      <h3 className="text-sm font-semibold text-gray-700">Login account</h3>
                      <p className="text-xs text-gray-500 mt-0.5">User account linked to this facility</p>
                    </div>
                    <table className={STYLES.table}>
                      <tbody className="divide-y divide-gray-100">
                        <tr className="hover:bg-gray-50/50 transition-colors"><td className="w-[38%] py-3 px-4 text-sm font-medium text-gray-600">Name</td><td className="py-3 px-4"><EditableField label="" value={home.user.name} field="userName" homeId={home.id} onUpdate={handleUpdate} hideLabel /></td></tr>
                        <tr className="hover:bg-gray-50/50 transition-colors"><td className="py-3 px-4 text-sm font-medium text-gray-600">Email</td><td className="py-3 px-4"><EditableField label="" value={home.user.email} field="userEmail" homeId={home.id} type="email" onUpdate={handleUpdate} hideLabel /></td></tr>
                        <tr className="hover:bg-gray-50/50 transition-colors"><td className="py-3 px-4 text-sm font-medium text-gray-600">Phone</td><td className="py-3 px-4"><EditableField label="" value={home.user.phone} field="userPhone" homeId={home.id} onUpdate={handleUpdate} hideLabel /></td></tr>
                        <tr className="hover:bg-gray-50/50 transition-colors"><td className="py-3 px-4 text-sm font-medium text-gray-600">Address</td><td className="py-3 px-4"><EditableField label="" value={home.user.address} field="userAddress" homeId={home.id} onUpdate={handleUpdate} hideLabel /></td></tr>
                        <tr className="hover:bg-gray-50/50 transition-colors"><td className="py-3 px-4 text-sm font-medium text-gray-600">Status</td><td className="py-3 px-4"><span className={cn("text-xs font-medium", home.user.status === 'ACTIVE' ? "text-emerald-700" : "text-red-700")}>{home.user.status}</span></td></tr>
                        <tr className="hover:bg-gray-50/50 transition-colors"><td className="py-3 px-4 text-sm font-medium text-gray-600">Joined</td><td className="py-3 px-4"><span className="flex items-center gap-1.5 text-sm text-gray-700"><Clock className="w-3.5 h-3.5 text-gray-400" />{new Date(home.user.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span></td></tr>
                        {home.user.emergencyContact && (() => {
                          try {
                            const ec = JSON.parse(home.user.emergencyContact)
                            return (
                              <tr className="hover:bg-gray-50/50 transition-colors"><td className="py-3 px-4 text-sm font-medium text-gray-600">Emergency contact</td><td className="py-3 px-4 text-sm text-gray-900">{ec.name || '—'}{ec.phone ? ` · ${ec.phone}` : ''}{ec.relation ? ` (${ec.relation})` : ''}</td></tr>
                            )
                          } catch { return null }
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Protocol tab */}
                {activeTab === 'protocol' && (
                  <div className="space-y-5">
                    <div className="rounded-lg border border-amber-200/80 bg-white overflow-hidden">
                      <div className="px-4 py-3 border-b border-amber-100 bg-amber-50/80">
                        <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Special needs & accommodations</h3>
                        <p className="text-xs text-amber-700/80 mt-0.5">Notes for staff and facilitators</p>
                      </div>
                      <div className="p-4">
                        <EditableField label="" value={home.specialNeeds} field="specialNeeds" homeId={home.id} type="textarea" onUpdate={handleUpdate} hideLabel />
                      </div>
                    </div>
                    <div className="rounded-lg border border-red-200/80 bg-white overflow-hidden">
                      <div className="px-4 py-3 border-b border-red-100 bg-red-50/80">
                        <h3 className="text-sm font-semibold text-red-800 flex items-center gap-2"><Shield className="w-4 h-4" /> Emergency protocol</h3>
                        <p className="text-xs text-red-700/80 mt-0.5">Procedures in case of emergency</p>
                      </div>
                      <div className="p-4">
                        <EditableField label="" value={home.emergencyProtocol} field="emergencyProtocol" homeId={home.id} type="textarea" onUpdate={handleUpdate} hideLabel />
                      </div>
                    </div>
                  </div>
                )}

                {/* Bookings tab */}
                {activeTab === 'events' && (
                  <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                      <h3 className="text-sm font-semibold text-gray-700">Recent bookings</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Bookings this facility is linked to (up to 10)</p>
                    </div>
                    {home.events.length > 0 ? (
                      <div className="table-scroll-wrapper">
                        <table className={STYLES.table}>
                          <thead className="bg-gray-50">
                            <tr className={STYLES.tableHeadRow}>
                              <th className={STYLES.tableHeader}>Booking</th>
                              <th className={STYLES.tableHeader}>Date</th>
                              <th className={STYLES.tableHeader}>Status</th>
                              <th className={cn(STYLES.tableHeader, "text-right")}>Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {[...home.events]
                              .sort((a, b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime())
                              .map((event) => (
                                <tr key={event.id} className={STYLES.tableRow}>
                                  <td className={cn(STYLES.tableCell, "font-medium text-gray-900")}>{event.title}</td>
                                  <td className={STYLES.tableCell}>{new Date(event.startDateTime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</td>
                                  <td className={STYLES.tableCell}><span className={cn("text-xs font-medium", event.status === 'PUBLISHED' ? "text-emerald-700" : event.status === 'COMPLETED' ? "text-sky-700" : "text-gray-600")}>{event.status}</span></td>
                                  <td className={cn(STYLES.tableCell, "text-right")}><a href={`/admin/bookings/${event.id}/edit`} className="text-primary-600 hover:text-primary-700 hover:underline text-sm font-medium inline-flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" /> Edit</a></td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="py-12 px-4 text-center">
                        <Calendar className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                        <p className="text-sm font-medium text-gray-500">No bookings linked</p>
                        <p className="text-xs text-gray-400 mt-1">This facility has no bookings yet.</p>
                        <a href={`/admin/homes/${home.id}`} className="inline-block mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium">View full details →</a>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions - shown on all tabs */}
                <div className="flex flex-wrap items-center gap-3 mt-5 pt-5 border-t border-gray-200">
                  {home.user.status !== 'ACTIVE' && <SendHomeInvitationButton homeId={home.id} />}
                  <a href={`/admin/homes/${home.id}`} className={cn(STYLES.btn, STYLES.btnPrimary, "inline-flex")}><ExternalLink className="w-4 h-4" /> Full details</a>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(home.address)}`} target="_blank" rel="noopener noreferrer" className={cn(STYLES.btn, STYLES.btnSecondary, "inline-flex")}><MapPin className="w-4 h-4" /> View on map</a>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
