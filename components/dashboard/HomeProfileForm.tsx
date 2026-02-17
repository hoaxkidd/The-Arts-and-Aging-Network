'use client'

import { useState } from 'react'
import { updateHomeDetails } from "@/app/actions/home-management"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"
import { Building2, Save, MapPin, Users, AlertTriangle, Camera, Settings, Info } from "lucide-react"
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete"

type HomeData = {
  id: string
  name: string
  address: string
  maxCapacity: number
  residentCount?: number | null
  type?: string | null
  region?: string | null
  isPartner?: boolean
  newsletterSub?: boolean
  accessibilityInfo?: string | null
  triggerWarnings?: string | null
  accommodations?: string | null
  specialNeeds?: string | null
  emergencyProtocol?: string | null
  photoPermissions?: string | null
  feedbackFormUrl?: string | null
  // These are still in the type for compatibility but not rendered here
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  contactPosition?: string | null
}

export function HomeProfileForm({ home }: { home: HomeData }) {
  const [address, setAddress] = useState(home.address || '')

  // Parse photo permissions JSON
  const photoPerms = home.photoPermissions ? JSON.parse(home.photoPermissions) : { formReceived: false, restrictions: '' }

  // Parse accessibility info JSON
  const accessInfo = home.accessibilityInfo ? JSON.parse(home.accessibilityInfo) : {
    wheelchair: false,
    hearingLoop: false,
    elevator: false,
    notes: ''
  }

  return (
    <form
        action={async (formData: FormData) => {
            await updateHomeDetails(formData)
            alert('Settings Saved')
        }}
        className="p-5 space-y-5"
    >
        <input type="hidden" name="id" value={home.id} />

        {/* Section 1: Facility Details */}
        <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                <Building2 className="w-4 h-4 text-primary-500" />
                Facility Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Facility Name</label>
                    <input
                        name="name"
                        defaultValue={home.name}
                        required
                        className={STYLES.input}
                        placeholder="Enter facility name"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Organization Type</label>
                    <select name="type" defaultValue={home.type || ''} className={STYLES.input}>
                        <option value="">Select Type</option>
                        <option value="PCH">Personal Care Home (PCH)</option>
                        <option value="LTC">Long Term Care (LTC)</option>
                        <option value="SCHOOL">School</option>
                        <option value="ARTS">Arts Organization</option>
                        <option value="COMMUNITY">Community Group</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Current Residents
                    </label>
                    <input
                        type="number"
                        name="residentCount"
                        defaultValue={home.residentCount || ''}
                        className={STYLES.input}
                        placeholder="Current census"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Max Capacity
                    </label>
                    <input
                        type="number"
                        name="maxCapacity"
                        defaultValue={home.maxCapacity}
                        className={STYLES.input}
                        placeholder="Licensed capacity"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Region / Location</label>
                    <input
                        name="region"
                        defaultValue={home.region || ''}
                        className={STYLES.input}
                        placeholder="e.g. North End, Downtown"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Physical Address
                    </label>
                    <AddressAutocomplete
                        name="address"
                        value={address}
                        onChange={setAddress}
                        placeholder="Enter complete address"
                        multiline
                        countries={['ca']}
                        className={cn(STYLES.input, "resize-none")}
                    />
                </div>
            </div>
        </div>

        {/* Section 2: Important Info for Staff */}
        <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                <Info className="w-4 h-4 text-blue-500" />
                Important Info for Staff
            </h2>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3">
                <p className="text-xs text-blue-700">
                    This information helps staff provide better service. It will be visible to staff assigned to events at your facility.
                </p>
            </div>

            {/* Accessibility */}
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Accessibility Features</label>
                <div className="flex flex-wrap gap-4 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="acc_wheelchair" defaultChecked={accessInfo.wheelchair} className="rounded text-primary-600" />
                        <span className="text-sm text-gray-700">Wheelchair Accessible</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="acc_hearingLoop" defaultChecked={accessInfo.hearingLoop} className="rounded text-primary-600" />
                        <span className="text-sm text-gray-700">Hearing Loop</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="acc_elevator" defaultChecked={accessInfo.elevator} className="rounded text-primary-600" />
                        <span className="text-sm text-gray-700">Elevator Available</span>
                    </label>
                </div>
                <input
                    name="acc_notes"
                    defaultValue={accessInfo.notes || ''}
                    className={STYLES.input}
                    placeholder="Additional accessibility notes (parking, entrances, etc.)"
                />
            </div>

            {/* Trigger Warnings */}
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    Trigger Warnings / Staff Awareness
                </label>
                <textarea
                    name="triggerWarnings"
                    defaultValue={home.triggerWarnings || ''}
                    rows={2}
                    className={cn(STYLES.input, "resize-none")}
                    placeholder="Any topics or themes staff should be mindful of..."
                />
            </div>

            {/* Special Needs & Allergies */}
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Special Needs & Allergies</label>
                <textarea
                    name="specialNeeds"
                    defaultValue={home.specialNeeds || ''}
                    rows={2}
                    className={cn(STYLES.input, "resize-none")}
                    placeholder="General allergies or medical needs in the facility..."
                />
            </div>

            {/* Accommodations */}
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Special Accommodations</label>
                <textarea
                    name="accommodations"
                    defaultValue={home.accommodations || ''}
                    rows={2}
                    className={cn(STYLES.input, "resize-none")}
                    placeholder="Scheduling preferences, cultural considerations..."
                />
            </div>

            {/* Emergency Protocol */}
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                    Emergency Protocol
                </label>
                <textarea
                    name="emergencyProtocol"
                    defaultValue={home.emergencyProtocol || ''}
                    rows={3}
                    className={cn(STYLES.input, "resize-none")}
                    placeholder="Evacuation points, emergency numbers, lock-down procedures..."
                />
            </div>

            {/* Photo Permissions (merged into this section) */}
            <div className="pt-2 border-t border-gray-100">
                <label className="block text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                    <Camera className="w-3 h-3 text-purple-500" />
                    Photo Permissions
                </label>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input type="checkbox" name="photo_formReceived" defaultChecked={photoPerms.formReceived} className="rounded text-primary-600" />
                    <span className="text-sm text-gray-700">Photo Permission Form Received</span>
                </label>
                <textarea
                    name="photo_restrictions"
                    defaultValue={photoPerms.restrictions || ''}
                    rows={2}
                    className={cn(STYLES.input, "resize-none")}
                    placeholder="Any residents who cannot be photographed, specific areas, etc."
                />
            </div>
        </div>

        {/* Section 3: Settings */}
        <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                <Settings className="w-4 h-4 text-gray-500" />
                Settings
            </h2>
            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="isPartner" defaultChecked={home.isPartner || false} className="rounded text-primary-600 focus:ring-primary-500" />
                        <span className="text-sm text-gray-700">Display as Partner on Website</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="newsletterSub" defaultChecked={home.newsletterSub || false} className="rounded text-primary-600 focus:ring-primary-500" />
                        <span className="text-sm text-gray-700">Subscribe to Newsletter</span>
                    </label>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Feedback Form URL</label>
                    <input
                        type="url"
                        name="feedbackFormUrl"
                        defaultValue={home.feedbackFormUrl || ''}
                        className={STYLES.input}
                        placeholder="https://forms.google.com/..."
                    />
                    <p className="text-xs text-gray-500 mt-1">Link to a feedback or evaluation form for your organization</p>
                </div>
            </div>
        </div>

        {/* Submit */}
        <div className="pt-3 flex justify-end border-t border-gray-100">
            <button type="submit" className={cn(STYLES.btn, STYLES.btnPrimary)}>
                <Save className="w-4 h-4" />
                Save Changes
            </button>
        </div>
    </form>
  )
}
