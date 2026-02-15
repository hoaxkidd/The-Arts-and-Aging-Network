'use client'

import { useState, useEffect } from 'react'
import { createEvent } from "@/app/actions/events"
import { CheckCircle, AlertTriangle, Plus, Search, Loader2, Calendar, Clock } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"

interface CurrentUser {
  name: string
  email: string
  role: string
}

export function EventForm({ locations, initialData, currentUser }: { locations: any[], initialData?: any, currentUser?: CurrentUser | null }) {
  const [isNewLocation, setIsNewLocation] = useState(false)
  
  // Address State
  const [address, setAddress] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null)
  
  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [timeError, setTimeError] = useState('')

  // Initialize with data if provided
  useEffect(() => {
    if (initialData) {
        // Pre-fill logic could go here if needed, but standard defaultValue works for inputs
        // For complex location logic, we might need more handling
    }
  }, [initialData])
  
  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (address.length > 2 && isNewLocation && !coords) {
        setIsSearching(true)
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&addressdetails=1&limit=5`)
          const data = await response.json()
          setSuggestions(data)
          setShowSuggestions(true)
        } catch (e) {
          console.error("Geocoding error", e)
        } finally {
          setIsSearching(false)
        }
      } else {
        setSuggestions([])
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [address, isNewLocation, coords])

  const selectAddress = (item: any) => {
    setAddress(item.display_name)
    setCoords({ lat: parseFloat(item.lat), lng: parseFloat(item.lon) })
    setSuggestions([])
    setShowSuggestions(false)
  }

  const clearAddress = () => {
    setAddress('')
    setCoords(null)
    setSuggestions([])
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
              
              <div className="relative group">
                <input 
                  name="newLocationAddress" 
                  required 
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value)
                    setCoords(null) 
                  }}
                  className={cn(STYLES.input, "pr-10 transition-shadow focus:ring-2 focus:ring-primary-100")} 
                  placeholder="Start typing address..." 
                  autoComplete="off"
                />
                <div className="absolute right-3 top-3 text-gray-400">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </div>

                {/* Address Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-60 overflow-auto">
                    {suggestions.map((item, i) => (
                      <li 
                        key={i}
                        onClick={() => selectAddress(item)}
                        className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0"
                      >
                        {item.display_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Verification Status Feedback */}
              {coords ? (
                <div className="flex items-center gap-2 text-green-700 text-xs bg-green-50 p-2.5 rounded-md border border-green-200 shadow-sm">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">Address verified & coordinates set.</span>
                </div>
              ) : address.length > 5 && !isSearching && (
                 <div className="flex items-center gap-2 text-amber-700 text-xs bg-amber-50 p-2.5 rounded-md border border-amber-200 shadow-sm">
                   <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                   <span className="font-medium">Unverified address. Please select a suggestion if possible.</span>
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
