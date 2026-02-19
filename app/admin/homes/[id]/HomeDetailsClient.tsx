'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building2, MapPin, Phone, Mail, User, Activity,
  Calendar, ArrowLeft, Edit3, Plus, Trash2, X, Check, Loader2,
  AlertTriangle, Users, ExternalLink, Clock, Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'
import {
  updateHomeDetails,
  addPersonnel,
  updatePersonnel,
  removePersonnel,
  deleteHome
} from '@/app/actions/home-management'
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete'

type Personnel = {
  id: string
  name: string
  email: string
  phone: string
  position: string
  isPrimary?: boolean
}

type AccessibilityInfo = { wheelchair?: boolean; hearingLoop?: boolean; elevator?: boolean; notes?: string }
type PhotoPermissionsParsed = { formReceived?: boolean; restrictions?: string }

type HomeData = {
  id: string
  name: string
  address: string
  latitude: number | null
  longitude: number | null
  residentCount: number
  maxCapacity: number
  type: string | null
  region: string | null
  specialNeeds: string | null
  emergencyProtocol: string | null
  triggerWarnings: string | null
  accommodations: string | null
  photoPermissions: string | null
  accessibilityInfo: string | null
  feedbackFormUrl: string | null
  isPartner: boolean
  newsletterSub: boolean
  contactName: string
  contactEmail: string
  contactPhone: string
  contactPosition: string | null
  additionalContacts: Personnel[]
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string | null
    email: string
    status: string
    createdAt: string
  }
  events: {
    id: string
    title: string
    startDateTime: string
    status: string
    _count: { attendance: number }
  }[]
  _count: { events: number }
}

// Delete Confirmation Modal
function DeleteConfirmationModal({
  homeName,
  isOpen,
  onClose,
  onConfirm,
  isPending
}: {
  homeName: string
  isOpen: boolean
  onClose: () => void
  onConfirm: (confirmText: string) => void
  isPending: boolean
}) {
  const [confirmText, setConfirmText] = useState('')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Delete Geriatric Home</h2>
              <p className="text-red-100 text-sm">This action cannot be undone</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-2">Warning: Permanent Deletion</h3>
            <p className="text-sm text-red-700 mb-3">
              You are about to permanently delete <strong>{homeName}</strong> and all associated data:
            </p>
            <ul className="text-sm text-red-700 space-y-1 ml-4 list-disc">
              <li>All facility information and contacts</li>
              <li>All events hosted at this location</li>
              <li>All attendance records and feedback</li>
              <li>The HOME_ADMIN user account</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="font-mono bg-gray-100 px-1 rounded">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="DELETE"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              autoComplete="off"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(confirmText)}
              disabled={confirmText !== 'DELETE' || isPending}
              className={cn(
                "flex-1 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2",
                confirmText === 'DELETE'
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              )}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Permanently
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Add/Edit Personnel Modal
function PersonnelModal({
  isOpen,
  onClose,
  onSave,
  personnel,
  isPending
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<Personnel, 'id'>) => void
  personnel?: Personnel
  isPending: boolean
}) {
  const [formData, setFormData] = useState({
    name: personnel?.name || '',
    email: personnel?.email || '',
    phone: personnel?.phone || '',
    position: personnel?.position || ''
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-primary-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5" />
            <h2 className="text-lg font-bold">
              {personnel ? 'Edit Personnel' : 'Add Personnel'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={cn(STYLES.input)}
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position/Role</label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className={cn(STYLES.input)}
              placeholder="Nurse Manager"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={cn(STYLES.input)}
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={cn(STYLES.input)}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(formData)}
              disabled={!formData.name || !formData.email || !formData.phone || isPending}
              className={cn(STYLES.btn, STYLES.btnPrimary, "flex-1 flex items-center justify-center gap-2")}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {personnel ? 'Update' : 'Add Personnel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

type QuickViewTab = 'facility' | 'contact' | 'account' | 'protocol' | 'events'
type ProtocolSubTab = 'specialNeeds' | 'emergency' | 'triggerWarnings' | 'accommodations' | 'accessibility' | 'photoPermissions' | 'feedbackFormUrl'

function parseAccessibilityInfo(raw: string | null | undefined): AccessibilityInfo {
  if (!raw) return {}
  try {
    const p = JSON.parse(raw) as AccessibilityInfo
    return { wheelchair: !!p.wheelchair, hearingLoop: !!p.hearingLoop, elevator: !!p.elevator, notes: p.notes ?? '' }
  } catch { return {} }
}

function parsePhotoPermissions(raw: string | null | undefined): PhotoPermissionsParsed {
  if (!raw) return {}
  if (raw.startsWith('{')) {
    try {
      const p = JSON.parse(raw) as PhotoPermissionsParsed
      return { formReceived: !!p.formReceived, restrictions: p.restrictions ?? '' }
    } catch { return { restrictions: raw } }
  }
  return { restrictions: raw }
}

export function HomeDetailsClient({ home }: { home: HomeData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<QuickViewTab>('facility')
  const [protocolSubTab, setProtocolSubTab] = useState<ProtocolSubTab>('specialNeeds')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPersonnelModal, setShowPersonnelModal] = useState(false)
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | undefined>()
  const [personnelToDelete, setPersonnelToDelete] = useState<string | null>(null)
  const [editAddress, setEditAddress] = useState(home.address || '')
  const acc = parseAccessibilityInfo(home.accessibilityInfo)
  const photo = parsePhotoPermissions(home.photoPermissions)

  const handleDeleteHome = async (confirmText: string) => {
    startTransition(async () => {
      const result = await deleteHome(home.id, confirmText)
      if (result.success) {
        router.push('/admin/homes')
      } else {
        alert(result.error)
      }
    })
  }

  const handleAddPersonnel = async (data: Omit<Personnel, 'id'>) => {
    startTransition(async () => {
      const result = await addPersonnel(home.id, data)
      if (result.success) {
        setShowPersonnelModal(false)
        router.refresh()
      } else {
        alert(result.error)
      }
    })
  }

  const handleUpdatePersonnel = async (data: Omit<Personnel, 'id'>) => {
    if (!editingPersonnel) return
    startTransition(async () => {
      const result = await updatePersonnel(home.id, editingPersonnel.id, data)
      if (result.success) {
        setEditingPersonnel(undefined)
        setShowPersonnelModal(false)
        router.refresh()
      } else {
        alert(result.error)
      }
    })
  }

  const handleRemovePersonnel = async (personnelId: string) => {
    setPersonnelToDelete(personnelId)
    startTransition(async () => {
      const result = await removePersonnel(home.id, personnelId)
      setPersonnelToDelete(null)
      if (result.success) router.refresh()
      else alert(result.error)
    })
  }

  const occupancyPercent = Math.round((home.residentCount / home.maxCapacity) * 100)

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 pb-12">
      {/* Header */}
      <div className="pt-2">
        <Link
          href="/admin/homes"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Homes
        </Link>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <span className="truncate">{home.name}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-gray-600 ml-0 sm:ml-14">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {home.address}
              </span>
              {home.type && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">{home.type}</span>
              )}
              {home.region && (
                <span className="text-xs text-gray-500">{home.region}</span>
              )}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(home.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline text-sm ml-2"
              >
                View Map
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <span className="text-xs text-gray-500 whitespace-nowrap">
              Registered {new Date(home.createdAt).toLocaleDateString()}
            </span>
            <button
              onClick={() => setShowDeleteModal(true)}
              className={cn(STYLES.btn, STYLES.btnDanger, "text-sm py-2")}
            >
              <Trash2 className="w-4 h-4" />
              Delete Home
            </button>
          </div>
        </div>
      </div>

      {/* Key metrics strip */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-4 sm:py-5 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-primary-600 tabular-nums">{home.residentCount}</span>
          <span className="text-sm text-gray-500">residents</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-gray-800 tabular-nums">{home.maxCapacity}</span>
          <span className="text-sm text-gray-500">capacity</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={cn("text-2xl font-bold tabular-nums", occupancyPercent >= 90 ? "text-red-600" : occupancyPercent >= 70 ? "text-amber-600" : "text-emerald-600")}>
            {occupancyPercent}%
          </span>
          <span className="text-sm text-gray-500">occupancy</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-gray-800 tabular-nums">{home._count.events}</span>
          <span className="text-sm text-gray-500">events</span>
        </div>
        {home.type && <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">{home.type}</span>}
        {home.region && <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">{home.region}</span>}
        <div className="w-full sm:w-auto sm:ml-auto text-xs text-gray-400 flex items-center gap-1.5 pt-1 sm:pt-0">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          Updated {new Date(home.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-x-auto">
        {(['facility', 'contact', 'account', 'protocol', 'events'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-all duration-150 shrink-0",
              activeTab === tab
                ? "border-primary-500 text-primary-600 bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.04)]"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/80"
            )}
          >
            {tab === 'facility' && <><Building2 className="w-4 h-4 inline-block mr-2 align-middle opacity-80" /> Facility</>}
            {tab === 'contact' && <><Phone className="w-4 h-4 inline-block mr-2 align-middle opacity-80" /> Contact</>}
            {tab === 'account' && <><User className="w-4 h-4 inline-block mr-2 align-middle opacity-80" /> Account</>}
            {tab === 'protocol' && <><Shield className="w-4 h-4 inline-block mr-2 align-middle opacity-80" /> Protocol</>}
            {tab === 'events' && <><Calendar className="w-4 h-4 inline-block mr-2 align-middle opacity-80" /> Events</>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-b-xl border border-gray-200 border-t-0 bg-gray-50/40 px-5 sm:px-6 py-6 min-h-[420px]">
        <form action={async (formData: FormData) => { await updateHomeDetails(formData); router.refresh() }} className="space-y-6">
          <input type="hidden" name="id" value={home.id} />

          {/* Facility tab */}
          <div className={cn(activeTab !== 'facility' && 'hidden')}>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80">
                <h3 className="text-sm font-semibold text-gray-800">Facility information</h3>
                <p className="text-xs text-gray-500 mt-1">Basic details for onboarding</p>
              </div>
              <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Facility name</label>
                  <input name="name" defaultValue={home.name} className={cn(STYLES.input)} placeholder="e.g. Sunrise Care Home" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                  <AddressAutocomplete name="address" value={editAddress} onChange={setEditAddress} placeholder="Start typing address..." countries={['ca']} className={cn(STYLES.input)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Facility type</label>
                  <input name="type" defaultValue={home.type ?? ''} placeholder="e.g. PCH, LTC, Retirement" className={cn(STYLES.input)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Region / area</label>
                  <input name="region" defaultValue={home.region ?? ''} placeholder="e.g. Winnipeg, Rural Manitoba" className={cn(STYLES.input)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Max capacity</label>
                  <input type="number" name="maxCapacity" defaultValue={home.maxCapacity} min={1} className={cn(STYLES.input)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Current residents</label>
                  <input type="number" name="residentCount" defaultValue={home.residentCount} min={0} className={cn(STYLES.input)} />
                </div>
                <div className="md:col-span-2 flex flex-wrap gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="isPartner" defaultChecked={home.isPartner} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm font-medium text-gray-700">Partner facility</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="newsletterSub" defaultChecked={home.newsletterSub} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm font-medium text-gray-700">Newsletter subscriber</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Contact tab */}
          <div className={cn(activeTab !== 'contact' && 'hidden')}>
            <div className="space-y-5">
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80">
                  <h3 className="text-sm font-semibold text-gray-800">Primary contact</h3>
                  <p className="text-xs text-gray-500 mt-1">Main point of contact for this facility</p>
                </div>
                <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                    <input name="contactName" defaultValue={home.contactName} className={cn(STYLES.input)} placeholder="Full name" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Position / role</label>
                    <input name="contactPosition" defaultValue={home.contactPosition ?? ''} className={cn(STYLES.input)} placeholder="e.g. Activity Coordinator" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <input name="contactEmail" type="email" defaultValue={home.contactEmail} className={cn(STYLES.input)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                    <input name="contactPhone" type="tel" defaultValue={home.contactPhone} className={cn(STYLES.input)} />
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">Additional contacts</h3>
                    <p className="text-xs text-gray-500 mt-1">Staff or personnel for events and coordination</p>
                  </div>
                  <button type="button" onClick={() => { setEditingPersonnel(undefined); setShowPersonnelModal(true) }} className={cn(STYLES.btn, "bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 text-sm")}>
                    <Plus className="w-4 h-4 mr-1" /> Add contact
                  </button>
                </div>
                <div className="divide-y divide-gray-100">
                  {home.additionalContacts.length > 0 ? (
                    home.additionalContacts.map((person) => (
                      <div key={person.id} className="p-4 hover:bg-gray-50/50 transition-colors group flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shrink-0"><User className="w-5 h-5" /></div>
                          <div>
                            <div className="font-medium text-gray-900">{person.name}</div>
                            <div className="text-xs text-gray-500">{person.position || 'Staff'}</div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              <a href={`mailto:${person.email}`} className="flex items-center gap-1 hover:text-primary-600"><Mail className="w-3.5 h-3.5" /> {person.email}</a>
                              <a href={`tel:${person.phone}`} className="flex items-center gap-1 hover:text-primary-600"><Phone className="w-3.5 h-3.5" /> {person.phone}</a>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button type="button" onClick={() => { setEditingPersonnel(person); setShowPersonnelModal(true) }} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"><Edit3 className="w-4 h-4" /></button>
                          <button type="button" onClick={() => handleRemovePersonnel(person.id)} disabled={isPending} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                            {isPending && personnelToDelete === person.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-10 text-center text-gray-500 text-sm">No additional contacts yet. Add staff or personnel for events and coordination.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Account tab */}
          <div className={cn(activeTab !== 'account' && 'hidden')}>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80">
                <h3 className="text-sm font-semibold text-gray-800">Login account</h3>
                <p className="text-xs text-gray-500 mt-1">User account linked to this facility</p>
              </div>
              <div className="p-5 sm:p-6">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    <tr><td className="py-3 pr-4 text-gray-500 font-medium w-[40%]">Account name</td><td className="py-3 text-gray-900 font-medium">{home.user.name || 'Not set'}</td></tr>
                    <tr><td className="py-3 pr-4 text-gray-500 font-medium">Email</td><td className="py-3"><a href={`mailto:${home.user.email}`} className="text-primary-600 hover:underline">{home.user.email}</a></td></tr>
                    <tr><td className="py-3 pr-4 text-gray-500 font-medium">Status</td><td className="py-3"><span className={cn("inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium", home.user.status === 'ACTIVE' ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800")}>{home.user.status}</span></td></tr>
                    <tr><td className="py-3 pr-4 text-gray-500 font-medium">Joined</td><td className="py-3 text-gray-700">{new Date(home.user.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td></tr>
                  </tbody>
                </table>
                <Link href={`/admin/users/${home.user.id}`} className={cn(STYLES.btn, STYLES.btnSecondary, "w-full justify-center mt-6")}>
                  <ExternalLink className="w-4 h-4" /> View user profile
                </Link>
              </div>
            </div>
          </div>

          {/* Protocol tab */}
          <div className={cn(activeTab !== 'protocol' && 'hidden')}>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {/* Protocol sub-tabs */}
              <div className="flex border-b border-gray-200 bg-gray-50/80 overflow-x-auto shrink-0">
                {([
                  ['specialNeeds', 'Special needs', AlertTriangle, 'amber'] as const,
                  ['emergency', 'Emergency', Shield, 'red'] as const,
                  ['triggerWarnings', 'Trigger warnings', AlertTriangle, 'purple'] as const,
                  ['accommodations', 'Accommodations', Activity, 'gray'] as const,
                  ['accessibility', 'Accessibility', Activity, 'sky'] as const,
                  ['photoPermissions', 'Photo permissions', Activity, 'blue'] as const,
                  ['feedbackFormUrl', 'Feedback form', Activity, 'gray'] as const
                ]).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setProtocolSubTab(id)}
                    className={cn(
                      "px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-all shrink-0",
                      protocolSubTab === id
                        ? "border-primary-500 text-primary-600 bg-white"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/80"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 inline-block mr-1.5 align-middle opacity-80" />
                    {label}
                  </button>
                ))}
              </div>
              {/* Sub-tab content */}
              <div className="p-5 sm:p-6">
                <div className={cn(protocolSubTab !== 'specialNeeds' && 'hidden')}>
                  <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Special needs & accommodations</h3>
                  <p className="text-xs text-amber-700/80 mb-3">Notes for staff and facilitators</p>
                  <textarea name="specialNeeds" defaultValue={home.specialNeeds ?? ''} rows={4} placeholder="Special considerations for events..." className={cn(STYLES.input)} />
                </div>
                <div className={cn(protocolSubTab !== 'emergency' && 'hidden')}>
                  <h3 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2"><Shield className="w-4 h-4" /> Emergency protocol</h3>
                  <p className="text-xs text-red-700/80 mb-3">Procedures in case of emergency</p>
                  <textarea name="emergencyProtocol" defaultValue={home.emergencyProtocol ?? ''} rows={4} placeholder="Fire, medical, evacuation..." className={cn(STYLES.input)} />
                </div>
                <div className={cn(protocolSubTab !== 'triggerWarnings' && 'hidden')}>
                  <h3 className="text-sm font-semibold text-purple-800 mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Content / trigger warnings</h3>
                  <p className="text-xs text-purple-700/80 mb-3">Topics to avoid, sensitivities</p>
                  <textarea name="triggerWarnings" defaultValue={home.triggerWarnings ?? ''} rows={3} placeholder="Topics to avoid, sensitivities..." className={cn(STYLES.input)} />
                </div>
                <div className={cn(protocolSubTab !== 'accommodations' && 'hidden')}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Accommodations</h3>
                  <p className="text-xs text-gray-500 mb-3">Physical or scheduling accommodations</p>
                  <textarea name="accommodations" defaultValue={home.accommodations ?? ''} rows={3} placeholder="e.g. Wheelchair access, flexible timing..." className={cn(STYLES.input)} />
                </div>
                <div className={cn(protocolSubTab !== 'accessibility' && 'hidden')}>
                  <h3 className="text-sm font-semibold text-sky-800 mb-2 flex items-center gap-2"><Activity className="w-4 h-4" /> Accessibility</h3>
                  <p className="text-xs text-sky-700/80 mb-3">On-site accessibility features</p>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-6">
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="acc_wheelchair" defaultChecked={acc.wheelchair} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" /><span className="text-sm font-medium text-gray-700">Wheelchair accessible</span></label>
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="acc_hearingLoop" defaultChecked={acc.hearingLoop} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" /><span className="text-sm font-medium text-gray-700">Hearing loop</span></label>
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="acc_elevator" defaultChecked={acc.elevator} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" /><span className="text-sm font-medium text-gray-700">Elevator</span></label>
                    </div>
                    <div><label className="block text-xs font-medium text-gray-600 mb-1">Notes</label><input name="acc_notes" defaultValue={acc.notes ?? ''} placeholder="Other accessibility notes" className={cn(STYLES.input)} /></div>
                  </div>
                </div>
                <div className={cn(protocolSubTab !== 'photoPermissions' && 'hidden')}>
                  <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2"><Activity className="w-4 h-4" /> Photo & media permissions</h3>
                  <p className="text-xs text-blue-700/80 mb-3">Consent and restrictions for photos/videos</p>
                  <div className="space-y-4">
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="photo_formReceived" defaultChecked={photo.formReceived} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" /><span className="text-sm font-medium text-gray-700">Consent form on file</span></label>
                    <div><label className="block text-xs font-medium text-gray-600 mb-1">Restrictions / notes</label><textarea name="photo_restrictions" defaultValue={photo.restrictions ?? ''} rows={2} placeholder="e.g. No photos of residents without consent" className={cn(STYLES.input)} /></div>
                  </div>
                </div>
                <div className={cn(protocolSubTab !== 'feedbackFormUrl' && 'hidden')}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Feedback form URL</h3>
                  <p className="text-xs text-gray-500 mb-3">Link to post-event feedback survey (optional)</p>
                  <input name="feedbackFormUrl" type="url" defaultValue={home.feedbackFormUrl ?? ''} placeholder="https://..." className={cn(STYLES.input)} />
                </div>
              </div>
            </div>
          </div>

          {/* Events tab */}
          <div className={cn(activeTab !== 'events' && 'hidden')}>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80">
                <h3 className="text-sm font-semibold text-gray-800">Recent events</h3>
                <p className="text-xs text-gray-500 mt-1">Events this facility is linked to</p>
              </div>
              {home.events.length > 0 ? (
                <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                  {home.events.map((event) => (
                    <Link key={event.id} href={`/admin/events/${event.id}/edit`} className="block p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{event.title}</div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(event.startDateTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        </div>
                        <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", event.status === 'PUBLISHED' ? "bg-emerald-100 text-emerald-800" : event.status === 'COMPLETED' ? "bg-sky-100 text-sky-800" : event.status === 'CANCELLED' ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-700")}>{event.status}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{event._count.attendance} attendees</div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-14 px-6 text-center">
                  <Calendar className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-500">No events yet</p>
                  <p className="text-xs text-gray-400 mt-1">This facility has no events scheduled.</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-6 mt-6 border-t border-gray-200">
            <button type="submit" className={cn(STYLES.btn, STYLES.btnPrimary)}>Save changes</button>
          </div>
        </form>
      </div>

      {/* Modals */}
      <DeleteConfirmationModal
        homeName={home.name}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteHome}
        isPending={isPending}
      />

      <PersonnelModal
        isOpen={showPersonnelModal}
        onClose={() => {
          setShowPersonnelModal(false)
          setEditingPersonnel(undefined)
        }}
        onSave={editingPersonnel ? handleUpdatePersonnel : handleAddPersonnel}
        personnel={editingPersonnel}
        isPending={isPending}
      />
    </div>
  )
}
