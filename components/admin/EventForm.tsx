'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createEvent } from "@/app/actions/events"
import { getFormTemplates } from "@/app/actions/form-templates"
import { CheckCircle, AlertTriangle, Plus, Search, Calendar, Clock, FileText, ExternalLink } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete"
import { FormTemplateBuilder } from "@/components/admin/FormTemplateBuilder"

interface CurrentUser {
  name: string
  email: string
  role: string
}

type FormTemplateOption = { id: string; title: string }

export function EventForm({
  locations,
  initialData,
  currentUser,
  formTemplates = [],
}: {
  locations: any[]
  initialData?: any
  currentUser?: CurrentUser | null
  formTemplates?: FormTemplateOption[]
}) {
  const [isNewLocation, setIsNewLocation] = useState(false)
  const [address, setAddress] = useState(initialData?.newLocationAddress ?? '')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false)
  const [templates, setTemplates] = useState<FormTemplateOption[]>(formTemplates)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialData?.requiredFormTemplateId ?? '')

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [timeError, setTimeError] = useState('')

  const clearAddress = () => {
    setAddress('')
    setCoords(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setTimeError('')
    
    const formData = new FormData(e.currentTarget)
    const start = new Date(formData.get('startDateTime') as string)
    const end = new Date(formData.get('endDateTime') as string)

    if (end <= start) {
      setTimeError('End time must be after start time')
      return
    }

    setIsSubmitting(true)
    
    // Add verification data
    if (isNewLocation) {
        formData.append('isNewLocation', 'true')
        if (coords) {
            formData.append('latitude', coords.lat.toString())
            formData.append('longitude', coords.lng.toString())
            formData.append('verified', 'true')
        } else {
             formData.append('verified', 'false')
        }
    }
    
    if (initialData?.id) {
        formData.append('id', initialData.id)
        // Call update action (we need to import it or pass it, but for now assuming createEvent handles both or we export separate)
        // Actually, let's stick to createEvent logic or add update
        // We will need to update the import to include updateEvent
    }

    await createEvent(formData) // TODO: Switch to updateEvent if ID exists
    setIsSubmitting(false)
  }

  return (
    <div className={STYLES.card}>
      <div className="flex items-center gap-2 mb-6 text-primary-700">
        <Plus className="w-5 h-5" />
        <h2 className="text-lg font-semibold">{initialData ? 'Edit Event' : 'Create New Event'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {initialData?.id && <input type="hidden" name="id" value={initialData.id} />}
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Event Title</label>
          <input 
            name="title" 
            required 
            defaultValue={initialData?.title}
            className={STYLES.input} 
            placeholder="e.g. Music Therapy Session" 
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary-500" />
              Start Time
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                name="startDateTime"
                required
                defaultValue={initialData?.startDateTime ? new Date(initialData.startDateTime).toISOString().slice(0, 16) : ''}
                className={cn(STYLES.input, "pl-3 pr-3 bg-primary-50/30 border-primary-200 focus:border-primary-500 focus:ring-primary-100")}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary-500" />
              End Time
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                name="endDateTime"
                required
                defaultValue={initialData?.endDateTime ? new Date(initialData.endDateTime).toISOString().slice(0, 16) : ''}
                className={cn(STYLES.input, "pl-3 pr-3 bg-primary-50/30 border-primary-200 focus:border-primary-500 focus:ring-primary-100")}
              />
            </div>
          </div>
        </div>
        {timeError && (
          <p className="text-red-600 text-xs flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {timeError}
          </p>
        )}

        {/* Location Selection Logic */}
        <div className="border-t border-b border-gray-100 py-4 my-4 space-y-4 bg-gray-50/50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-gray-700">Location</label>
            <button 
              type="button" 
              onClick={() => {
                setIsNewLocation(!isNewLocation)
                clearAddress()
              }}
              className="text-xs text-primary-600 hover:underline font-medium flex items-center gap-1"
            >
              {isNewLocation ? <Search className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              {isNewLocation ? "Select Existing" : "Create New Location"}
            </button>
          </div>

          {!isNewLocation ? (
            <select 
                name="locationId" 
                defaultValue={initialData?.locationId}
                className={cn(STYLES.input, STYLES.select)}
            >
              {locations.map((loc: any) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          ) : (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 relative">
              <input 
                name="newLocationName" 
                required 
                className={STYLES.input} 
                placeholder="Location Name (e.g. Community Center)" 
              />
              
              <div>
                <AddressAutocomplete
                  name="newLocationAddress"
                  value={address}
                  onChange={(val, components) => {
                    setAddress(val)
                    if (components?.lat != null && components?.lng != null) {
                      setCoords({ lat: components.lat, lng: components.lng })
                    } else {
                      setCoords(null)
                    }
                  }}
                  onCoords={(lat, lng) => setCoords({ lat, lng })}
                  placeholder="Start typing address..."
                  required
                  countries={['ca']}
                  className={STYLES.input}
                />
              </div>

              {/* Verification Status Feedback */}
              {coords ? (
                <div className="flex items-center gap-2 text-green-700 text-xs bg-green-50 p-2.5 rounded-md border border-green-200 shadow-sm">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">Address verified & coordinates set.</span>
                </div>
              ) : address.length > 5 && (
                 <div className="flex items-center gap-2 text-amber-700 text-xs bg-amber-50 p-2.5 rounded-md border border-amber-200 shadow-sm">
                   <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                   <span className="font-medium">Unverified address. Please select a suggestion from the dropdown if available.</span>
                 </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Capacity</label>
            <input
                type="number"
                name="maxAttendees"
                defaultValue={initialData?.maxAttendees || 20}
                className={STYLES.input}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Auto-Accept</label>
            <input
                type="number"
                name="autoAcceptLimit"
                defaultValue={initialData?.autoAcceptLimit || 4}
                className={STYLES.input}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
          <textarea
            name="description"
            rows={3}
            defaultValue={initialData?.description}
            className={cn(STYLES.input, "pt-2")}
          />
        </div>

        {/* Sign-up form template */}
        <div className="border-t border-gray-100 pt-4 mt-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary-500" />
              Sign-up form template
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCreateTemplateModal(true)}
                className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Create new template
              </button>
              <button
                type="button"
                onClick={async () => {
                  const res = await getFormTemplates({ isActive: true })
                  if (res.success && res.data) {
                    const fillable = res.data.filter((t) => t.isFillable).map((t) => ({ id: t.id, title: t.title }))
                    setTemplates(fillable)
                  }
                }}
                className="text-xs font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                Refresh list
              </button>
              <Link
                href="/admin/form-templates"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                Manage templates
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
          <select
            name="requiredFormTemplateId"
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className={cn(STYLES.input, STYLES.select)}
          >
            <option value="">None – home admins request without a form</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">
            If set, home admins must fill this form when requesting to participate. Create a new template or choose from existing ones.
          </p>
        </div>

        {/* Create template modal */}
        {showCreateTemplateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Create form template</h3>
                <button
                  type="button"
                  onClick={() => setShowCreateTemplateModal(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <FormTemplateBuilder
                  initialCategory="EVENT_SIGNUP"
                  onCreated={(template) => {
                    setTemplates((prev) => [...prev, template])
                    setSelectedTemplateId(template.id)
                    setShowCreateTemplateModal(false)
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Organizer Information */}
        <div className="border-t border-gray-100 pt-4 mt-4 space-y-4">
          <label className="block text-sm font-semibold text-gray-700">Organizer Information</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
              <input
                name="organizerName"
                defaultValue={initialData?.organizerName || currentUser?.name || ''}
                className={STYLES.input}
                placeholder="e.g. John Smith"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Role / Title</label>
              <input
                name="organizerRole"
                defaultValue={initialData?.organizerRole || currentUser?.role || ''}
                className={STYLES.input}
                placeholder="e.g. Event Coordinator"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input
                type="email"
                name="organizerEmail"
                defaultValue={initialData?.organizerEmail || currentUser?.email || ''}
                className={STYLES.input}
                placeholder="e.g. organizer@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
              <input
                type="tel"
                name="organizerPhone"
                defaultValue={initialData?.organizerPhone}
                className={STYLES.input}
                placeholder="e.g. (555) 123-4567"
              />
            </div>
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className={cn(STYLES.btn, STYLES.btnPrimary, "w-full")}>
          {isSubmitting ? (initialData ? "Updating..." : "Publishing...") : (initialData ? "Update Event" : "Publish Event")}
        </button>
      </form>
    </div>
  )
}
