'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building2, MapPin, Phone, Mail, User, ShieldAlert, Activity,
  Calendar, ArrowLeft, Edit3, Plus, Trash2, X, Check, Loader2,
  AlertTriangle, Users, ExternalLink, Clock
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

type HomeData = {
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

export function HomeDetailsClient({ home }: { home: HomeData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPersonnelModal, setShowPersonnelModal] = useState(false)
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | undefined>()
  const [personnelToDelete, setPersonnelToDelete] = useState<string | null>(null)
  const [editAddress, setEditAddress] = useState(home.address || '')

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
    startTransition(async () => {
      const result = await removePersonnel(home.id, personnelId)
      if (result.success) {
        setPersonnelToDelete(null)
        router.refresh()
      } else {
        alert(result.error)
      }
    })
  }

  const occupancyPercent = Math.round((home.residentCount / home.maxCapacity) * 100)

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <Link
          href="/admin/homes"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Homes
        </Link>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                <Building2 className="w-7 h-7" />
              </div>
              {home.name}
            </h1>
            <div className="flex items-center gap-2 mt-2 text-gray-600 ml-1">
              <MapPin className="w-4 h-4" />
              <span>{home.address}</span>
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

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              Registered {new Date(home.createdAt).toLocaleDateString()}
            </span>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 hover:border-red-300 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Home
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{home.maxCapacity}</div>
          <div className="text-xs text-gray-500 font-medium">Max Capacity</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{home.residentCount}</div>
          <div className="text-xs text-gray-500 font-medium">Current Residents</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className={cn(
            "text-2xl font-bold",
            occupancyPercent >= 90 ? "text-red-600" :
            occupancyPercent >= 70 ? "text-yellow-600" : "text-green-600"
          )}>
            {occupancyPercent}%
          </div>
          <div className="text-xs text-gray-500 font-medium">Occupancy Rate</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-purple-600">{home._count.events}</div>
          <div className="text-xs text-gray-500 font-medium">Total Events</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit Form */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900">Facility Information</h3>
            </div>
            <form action={async (formData: FormData): Promise<void> => { await updateHomeDetails(formData) }} className="p-6 space-y-4">
              <input type="hidden" name="id" value={home.id} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Facility Name</label>
                  <input name="name" defaultValue={home.name} className={cn(STYLES.input)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                  <AddressAutocomplete
                    name="address"
                    value={editAddress}
                    onChange={setEditAddress}
                    placeholder="Start typing address..."
                    countries={['ca']}
                    className={cn(STYLES.input)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Max Capacity</label>
                  <input type="number" name="maxCapacity" defaultValue={home.maxCapacity} className={cn(STYLES.input)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Current Residents</label>
                  <input type="number" name="residentCount" defaultValue={home.residentCount} className={cn(STYLES.input)} />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" className={cn(STYLES.btn, STYLES.btnPrimary)}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          {/* Personnel Management */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Personnel & Contacts</h3>
              </div>
              <button
                onClick={() => {
                  setEditingPersonnel(undefined)
                  setShowPersonnelModal(true)
                }}
                className={cn(STYLES.btn, "bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 text-sm")}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Contact
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {/* Primary Contact */}
              <div className="p-4 bg-primary-50/50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{home.contactName}</div>
                      <div className="text-xs text-primary-600 font-medium">
                        {home.contactPosition || 'Primary Contact'}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <a href={`mailto:${home.contactEmail}`} className="flex items-center gap-1 hover:text-primary-600">
                          <Mail className="w-3.5 h-3.5" /> {home.contactEmail}
                        </a>
                        <a href={`tel:${home.contactPhone}`} className="flex items-center gap-1 hover:text-primary-600">
                          <Phone className="w-3.5 h-3.5" /> {home.contactPhone}
                        </a>
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs font-medium">
                    Primary
                  </span>
                </div>
              </div>

              {/* Additional Contacts */}
              {home.additionalContacts.length > 0 ? (
                home.additionalContacts.map((person) => (
                  <div key={person.id} className="p-4 hover:bg-gray-50 transition-colors group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{person.name}</div>
                          <div className="text-xs text-gray-500">{person.position || 'Staff'}</div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <a href={`mailto:${person.email}`} className="flex items-center gap-1 hover:text-primary-600">
                              <Mail className="w-3.5 h-3.5" /> {person.email}
                            </a>
                            <a href={`tel:${person.phone}`} className="flex items-center gap-1 hover:text-primary-600">
                              <Phone className="w-3.5 h-3.5" /> {person.phone}
                            </a>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingPersonnel(person)
                            setShowPersonnelModal(true)
                          }}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemovePersonnel(person.id)}
                          disabled={isPending}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          {isPending && personnelToDelete === person.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-gray-500 text-sm">
                  No additional contacts added yet.
                </div>
              )}
            </div>
          </div>

          {/* Special Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-amber-50 rounded-lg border border-amber-200 p-5">
              <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-600" />
                Special Needs
              </h4>
              <p className="text-sm text-amber-800 leading-relaxed">
                {home.specialNeeds || 'No special needs documented.'}
              </p>
            </div>
            <div className="bg-red-50 rounded-lg border border-red-200 p-5">
              <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                Emergency Protocol
              </h4>
              <p className="text-sm text-red-800 leading-relaxed">
                {home.emergencyProtocol || 'No emergency protocol documented.'}
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Admin Account */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900">Admin Account</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">Account Name</div>
                <div className="font-medium text-gray-900">{home.user.name || 'Not set'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Email</div>
                <a href={`mailto:${home.user.email}`} className="text-primary-600 hover:underline text-sm">
                  {home.user.email}
                </a>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-500">Status</span>
                <span className={cn(
                  "px-2 py-1 rounded text-xs font-medium",
                  home.user.status === 'ACTIVE'
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                )}>
                  {home.user.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Joined</span>
                <span className="text-xs text-gray-700">
                  {new Date(home.user.createdAt).toLocaleDateString()}
                </span>
              </div>
              <Link
                href={`/admin/users/${home.user.id}`}
                className="block w-full text-center px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                <ExternalLink className="w-4 h-4 inline mr-1" />
                View User Profile
              </Link>
            </div>
          </div>

          {/* Recent Events */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900">Recent Events</h3>
            </div>
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {home.events.length > 0 ? (
                home.events.map(event => (
                  <Link
                    key={event.id}
                    href={`/admin/events/${event.id}/edit`}
                    className="block p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{event.title}</div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(event.startDateTime).toLocaleDateString()}
                        </div>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        event.status === 'PUBLISHED' ? "bg-green-100 text-green-700" :
                        event.status === 'COMPLETED' ? "bg-blue-100 text-blue-700" :
                        event.status === 'CANCELLED' ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      )}>
                        {event.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {event._count.attendance} attendees
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-6 text-center text-gray-500 text-sm">
                  No events scheduled.
                </div>
              )}
            </div>
          </div>
        </div>
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
