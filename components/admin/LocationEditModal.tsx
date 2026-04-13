'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Pencil, Trash2, Search, MapPin, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete'
import { getLocations, createLocation, updateLocation, deleteLocation } from '@/app/actions/locations'

type Location = {
  id: string
  name: string
  address: string
  type: string
  latitude?: number | null
  longitude?: number | null
  verified?: boolean
  createdAt: Date
  updatedAt: Date
  _count?: {
    events: number
  }
}

interface LocationEditModalProps {
  isOpen: boolean
  onClose: () => void
  onLocationsChange?: () => void
}

export function LocationEditModal({ isOpen, onClose, onLocationsChange }: LocationEditModalProps) {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', address: '' })
  const [editCoords, setEditCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', address: '' })
  const [addCoords, setAddCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchLocations()
    }
  }, [isOpen])

  const fetchLocations = async () => {
    setLoading(true)
    setError(null)
    const result = await getLocations()
    if (result.success && result.data) {
      setLocations(result.data)
    } else {
      setError(result.error || 'Failed to load locations')
    }
    setLoading(false)
  }

  const handleEdit = (location: Location) => {
    setEditingId(location.id)
    setEditForm({ name: location.name, address: location.address })
    setEditCoords(location.latitude && location.longitude ? { lat: location.latitude, lng: location.longitude } : null)
    setError(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({ name: '', address: '' })
    setEditCoords(null)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editForm.name.trim() || !editForm.address.trim()) {
      setError('Name and address are required')
      return
    }

    setSaving(true)
    setError(null)

    const result = await updateLocation(editingId, {
      name: editForm.name,
      address: editForm.address,
      latitude: editCoords?.lat,
      longitude: addCoords?.lng,
      verified: !!editCoords,
    })

    if (result.success) {
      setEditingId(null)
      setEditForm({ name: '', address: '' })
      setEditCoords(null)
      await fetchLocations()
      onLocationsChange?.()
      setSuccess('Location updated successfully')
      setTimeout(() => setSuccess(null), 3000)
    } else {
      setError(result.error || 'Failed to update location')
    }

    setSaving(false)
  }

  const handleDelete = async (location: Location) => {
    if (!confirm(`Are you sure you want to delete "${location.name}"?${location._count?.events ? ` This location is used by ${location._count.events} booking(s).` : ''}`)) {
      return
    }

    setDeletingId(location.id)
    setError(null)

    const result = await deleteLocation(location.id)

    if (result.success) {
      await fetchLocations()
      onLocationsChange?.()
      setSuccess('Location deleted successfully')
      setTimeout(() => setSuccess(null), 3000)
    } else {
      setError(result.error || 'Failed to delete location')
    }

    setDeletingId(null)
  }

  const handleAddLocation = async () => {
    if (!addForm.name.trim() || !addForm.address.trim()) {
      setError('Name and address are required')
      return
    }

    setSaving(true)
    setError(null)

    const result = await createLocation({
      name: addForm.name,
      address: addForm.address,
      latitude: addCoords?.lat,
      longitude: addCoords?.lng,
      verified: !!addCoords,
    })

    if (result.success) {
      setAddForm({ name: '', address: '' })
      setAddCoords(null)
      setShowAddForm(false)
      await fetchLocations()
      onLocationsChange?.()
      setSuccess('Location added successfully')
      setTimeout(() => setSuccess(null), 3000)
    } else {
      setError(result.error || 'Failed to add location')
    }

    setSaving(false)
  }

  const filteredLocations = locations.filter(loc =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.address.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Manage Locations</h2>
              <p className="text-xs text-gray-500">{locations.length} location(s)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(STYLES.input, "pl-9")}
            />
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-3 flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mx-6 mt-3 flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-200">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}

        {/* Location List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No locations found</p>
              <p className="text-sm text-gray-400 mt-1">
                {searchQuery ? 'Try a different search term' : 'Add your first location below'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLocations.map((location) => (
                <div
                  key={location.id}
                  className="border border-gray-200 rounded-lg p-4 bg-white hover:border-gray-300 transition-colors"
                >
                  {editingId === location.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="Location name"
                        className={STYLES.input}
                        autoFocus
                      />
                      <AddressAutocomplete
                        value={editForm.address}
                        onChange={(val, components) => {
                          setEditForm({ ...editForm, address: val })
                          if (components?.lat != null && components?.lng != null) {
                            setEditCoords({ lat: components.lat, lng: components.lng })
                          } else {
                            setEditCoords(null)
                          }
                        }}
                        placeholder="Start typing address..."
                        countries={['ca']}
                        className={STYLES.input}
                      />
                      {editCoords && (
                        <div className="flex items-center gap-2 text-green-600 text-xs">
                          <CheckCircle className="w-3 h-3" />
                          Address verified
                        </div>
                      )}
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          disabled={saving}
                          className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors flex items-center gap-1"
                        >
                          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 truncate">{location.name}</p>
                            {location.verified && (
                              <CheckCircle className="w-3 h-3 text-green-500 shrink-0" aria-label="Verified address" />
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate">{location.address}</p>
                          {location._count?.events ? (
                            <p className="text-xs text-amber-600 mt-1">
                              Used by {location._count.events} booking(s)
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEdit(location)}
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          aria-label="Edit location"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(location)}
                          disabled={deletingId === location.id}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          aria-label="Delete location"
                        >
                          {deletingId === location.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Location */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          {showAddForm ? (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Add New Location</h3>
              <input
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="Location name (e.g. Community Center)"
                className={STYLES.input}
                autoFocus
              />
              <AddressAutocomplete
                value={addForm.address}
                onChange={(val, components) => {
                  setAddForm({ ...addForm, address: val })
                  if (components?.lat != null && components?.lng != null) {
                    setAddCoords({ lat: components.lat, lng: components.lng })
                  } else {
                    setAddCoords(null)
                  }
                }}
                placeholder="Start typing address..."
                countries={['ca']}
                className={STYLES.input}
              />
              {addCoords && (
                <div className="flex items-center gap-2 text-green-600 text-xs">
                  <CheckCircle className="w-3 h-3" />
                  Address verified
                </div>
              )}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setAddForm({ name: '', address: '' })
                    setAddCoords(null)
                    setError(null)
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddLocation}
                  disabled={saving || !addForm.name.trim() || !addForm.address.trim()}
                  className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                  Add Location
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add New Location
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
