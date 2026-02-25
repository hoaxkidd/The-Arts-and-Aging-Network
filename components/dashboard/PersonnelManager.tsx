'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, Mail, Phone, Plus, Edit3, Trash2, X, Check,
  Loader2, User, AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'
import { addPersonnel, updatePersonnel, removePersonnel, updatePrimaryContact } from '@/app/actions/home-management'

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
  contactName: string
  contactEmail: string
  contactPhone: string
  contactPosition: string | null
  additionalContacts: Personnel[]
}

// Modal for Add/Edit Personnel
function PersonnelModal({
  isOpen,
  onClose,
  onSave,
  personnel,
  isPending,
  title,
  subtitle
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<Personnel, 'id'>) => void
  personnel?: Personnel
  isPending: boolean
  title?: string
  subtitle?: string
}) {
  const [formData, setFormData] = useState({
    name: personnel?.name || '',
    email: personnel?.email || '',
    phone: personnel?.phone || '',
    position: personnel?.position || ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Sync form data when personnel changes (e.g. opening modal for a different contact)
  useEffect(() => {
    setFormData({
      name: personnel?.name || '',
      email: personnel?.email || '',
      phone: personnel?.phone || '',
      position: personnel?.position || ''
    })
    setErrors({})
  }, [personnel?.id, personnel?.name, personnel?.email, personnel?.phone, personnel?.position])

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format'
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validate()) {
      onSave(formData)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">
                  {title || (personnel ? 'Edit Contact' : 'Add New Contact')}
                </h2>
                <p className="text-primary-100 text-sm">
                  {subtitle || (personnel ? 'Update contact information' : 'Add a new team member')}
                </p>
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

        {/* Form */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={cn(
                STYLES.input,
                errors.name && "border-red-300 focus:ring-red-500"
              )}
              placeholder="Jane Smith"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Position / Role
            </label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className={cn(STYLES.input)}
              placeholder="e.g., Nurse Manager, Activities Director"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={cn(
                STYLES.input,
                errors.email && "border-red-300 focus:ring-red-500"
              )}
              placeholder="jane@facility.com"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.email}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={cn(
                STYLES.input,
                errors.phone && "border-red-300 focus:ring-red-500"
              )}
              placeholder="(555) 123-4567"
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.phone}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className={cn(
                STYLES.btn, STYLES.btnPrimary,
                "flex-1 flex items-center justify-center gap-2"
              )}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {personnel ? 'Update Contact' : 'Add Contact'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Delete Confirmation Modal
function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  personnelName,
  isPending
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  personnelName: string
  isPending: boolean
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove Contact?</h3>
          <p className="text-sm text-gray-600 mb-6">
            Are you sure you want to remove <strong>{personnelName}</strong> from your contacts list? This action cannot be undone.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Contact Card Component
function ContactCard({
  person,
  isPrimary,
  onEdit,
  onDelete,
}: {
  person: { name: string; email: string; phone: string; position: string | null; id?: string }
  isPrimary?: boolean
  onEdit?: () => void
  onDelete?: () => void
}) {
  return (
    <div className={cn(
      "p-3 rounded-lg border transition-all group",
      isPrimary
        ? "bg-gradient-to-br from-primary-50 to-blue-50 border-primary-200"
        : "bg-white border-gray-200 hover:border-primary-200 hover:shadow-sm"
    )}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
            isPrimary
              ? "bg-primary-600 text-white"
              : "bg-gray-100 text-gray-600"
          )}>
            {person.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900 text-sm truncate">{person.name}</h3>
              {isPrimary && (
                <span className="px-1.5 py-0.5 bg-primary-600 text-white rounded text-[10px] font-medium flex-shrink-0">
                  Primary
                </span>
              )}
            </div>
            <p className={cn(
              "text-xs mt-0.5",
              isPrimary ? "text-primary-600" : "text-gray-500"
            )}>
              {person.position || 'Staff Member'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
            {person.email && (
            <a
              href={`mailto:${person.email}`}
              className="flex items-center gap-1 hover:text-primary-600 transition-colors"
            >
              <Mail className="w-3 h-3" />
              <span className="truncate max-w-[120px]">{person.email}</span>
            </a>
            )}
            <a
              href={`tel:${person.phone}`}
              className="flex items-center gap-1 hover:text-primary-600 transition-colors"
            >
              <Phone className="w-3 h-3" />
              {person.phone}
            </a>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                title="Edit contact"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Remove contact"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile contact info */}
      <div className="sm:hidden flex items-center gap-3 mt-2 text-xs text-gray-500 pl-13">
        {person.email && (
        <a href={`mailto:${person.email}`} className="flex items-center gap-1 hover:text-primary-600">
          <Mail className="w-3 h-3" />
          <span className="truncate">{person.email}</span>
        </a>
        )}
        <a href={`tel:${person.phone}`} className="flex items-center gap-1 hover:text-primary-600">
          <Phone className="w-3 h-3" />
          {person.phone}
        </a>
      </div>
    </div>
  )
}

export function PersonnelManager({ home }: { home: HomeData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Personnel | null>(null)
  const [editingPrimary, setEditingPrimary] = useState(false)
  const [deletingPerson, setDeletingPerson] = useState<Personnel | null>(null)

  const handleAddPersonnel = (data: Omit<Personnel, 'id'>) => {
    startTransition(async () => {
      const result = await addPersonnel(home.id, data)
      if (result.success) {
        setShowAddModal(false)
        router.refresh()
      } else {
        alert(result.error || 'Failed to add contact')
      }
    })
  }

  const handleUpdatePersonnel = (data: Omit<Personnel, 'id'>) => {
    if (!editingPerson) return
    startTransition(async () => {
      const result = await updatePersonnel(home.id, editingPerson.id, data)
      if (result.success) {
        setEditingPerson(null)
        router.refresh()
      } else {
        alert(result.error || 'Failed to update contact')
      }
    })
  }

  const handleUpdatePrimary = (data: Omit<Personnel, 'id'>) => {
    startTransition(async () => {
      const result = await updatePrimaryContact(home.id, data)
      if (result.success) {
        setEditingPrimary(false)
        router.refresh()
      } else {
        alert(result.error || 'Failed to update primary contact')
      }
    })
  }

  const handleDeletePersonnel = () => {
    if (!deletingPerson) return
    startTransition(async () => {
      const result = await removePersonnel(home.id, deletingPerson.id)
      if (result.success) {
        setDeletingPerson(null)
        router.refresh()
      } else {
        alert(result.error || 'Failed to remove contact')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Team Contacts</h1>
            <p className="text-xs text-gray-500">
              {1 + home.additionalContacts.length} contact{home.additionalContacts.length !== 0 ? 's' : ''} for {home.name}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className={cn(STYLES.btn, STYLES.btnPrimary, "py-2 text-sm")}
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {/* Primary Contact */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Primary Contact
        </h2>
        <ContactCard
          person={{
            name: home.contactName,
            email: home.contactEmail,
            phone: home.contactPhone,
            position: home.contactPosition
          }}
          isPrimary
          onEdit={() => setEditingPrimary(true)}
        />
      </div>

      {/* Additional Contacts */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Additional Contacts ({home.additionalContacts.length})
        </h2>
        {home.additionalContacts.length > 0 ? (
          <div className="grid gap-3">
            {home.additionalContacts.map((person) => (
              <ContactCard
                key={person.id}
                person={person}
                onEdit={() => setEditingPerson(person)}
                onDelete={() => setDeletingPerson(person)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900 mb-1">No additional contacts yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              Add team members like nurses, activity coordinators, or other key staff.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className={cn(STYLES.btn, "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Contact
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <PersonnelModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddPersonnel}
        isPending={isPending}
      />

      <PersonnelModal
        isOpen={!!editingPerson}
        onClose={() => setEditingPerson(null)}
        onSave={handleUpdatePersonnel}
        personnel={editingPerson || undefined}
        isPending={isPending}
      />

      <PersonnelModal
        isOpen={editingPrimary}
        onClose={() => setEditingPrimary(false)}
        onSave={handleUpdatePrimary}
        personnel={{
          id: 'primary',
          name: home.contactName,
          email: home.contactEmail,
          phone: home.contactPhone,
          position: home.contactPosition || ''
        }}
        isPending={isPending}
        title="Edit Primary Contact"
        subtitle="Update the main contact for this facility"
      />

      <DeleteConfirmModal
        isOpen={!!deletingPerson}
        onClose={() => setDeletingPerson(null)}
        onConfirm={handleDeletePersonnel}
        personnelName={deletingPerson?.name || ''}
        isPending={isPending}
      />
    </div>
  )
}
