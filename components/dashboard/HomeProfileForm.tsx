'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateHomeDetails } from "@/app/actions/home-management"
import { STYLES } from "@/lib/styles"
import { cn, safeJsonParse } from "@/lib/utils"
import { Building2, Save, MapPin, Users, AlertTriangle, Camera, Settings, Info, Check, User, ChevronDown, ChevronUp } from "lucide-react"
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete"
import { PhoneInput } from "@/components/ui/PhoneInput"
import { formatPhoneDashed } from "@/lib/phone"

type SecondaryContact = {
  name: string
  position: string
  email: string
  phone: string
}

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
  additionalContacts?: string | null
  useCustomNotificationEmail?: boolean
  notificationEmail?: string | null
}

export function HomeProfileForm({ home }: { home: HomeData }) {
  const [address, setAddress] = useState(home.address || '')
  const [useCustomNotificationEmail, setUseCustomNotificationEmail] = useState(Boolean(home.useCustomNotificationEmail))
  const [secondaryContacts, setSecondaryContacts] = useState<SecondaryContact[]>(
    safeJsonParse<SecondaryContact[]>(home.additionalContacts, []).map((contact) => ({
      name: contact?.name || '',
      position: contact?.position || '',
      email: contact?.email || '',
      phone: formatPhoneDashed(contact?.phone || ''),
    }))
  )
  const [isPending, startTransition] = useTransition()
  const [contactsExpanded, setContactsExpanded] = useState(false)
  const [saved, setSaved] = useState(false)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Parse photo permissions JSON
  const photoPerms = safeJsonParse(home.photoPermissions, { formReceived: false, restrictions: '' })

  // Parse accessibility info JSON
  const accessInfo = safeJsonParse(home.accessibilityInfo, {
    wheelchair: false,
    hearingLoop: false,
    elevator: false,
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateHomeDetails(formData)
      if (result?.error) {
        setError(result.error)
        setInfoMessage(null)
        setSaved(false)
      } else {
        setError(null)
        setInfoMessage((result as any)?.message || null)
        setSaved(!(result as any)?.pendingApproval)
        router.refresh()
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  const updateSecondaryContact = (index: number, field: keyof SecondaryContact, value: string) => {
    setSecondaryContacts((prev) =>
      prev.map((contact, i) => {
        if (i !== index) return contact
        if (field === 'phone') {
          return { ...contact, phone: formatPhoneDashed(value) }
        }
        return { ...contact, [field]: value }
      })
    )
  }

  const addSecondaryContact = () => {
    setContactsExpanded(true)
    setSecondaryContacts((prev) => [...prev, { name: '', position: '', email: '', phone: '' }])
  }

  const removeSecondaryContact = (index: number) => {
    setSecondaryContacts((prev) => prev.filter((_, i) => i !== index))
  }

  const serializedSecondaryContacts = JSON.stringify(
    secondaryContacts
      .map((contact) => ({
        name: contact.name.trim(),
        position: contact.position.trim(),
        email: contact.email.trim(),
        phone: contact.phone.trim(),
      }))
      .filter((contact) => contact.name || contact.position || contact.email || contact.phone)
  )

  return (
    <form
        onSubmit={handleSubmit}
        className="p-5 space-y-5"
    >
        <input type="hidden" name="id" value={home.id} />
        <input type="hidden" name="additionalContacts" value={serializedSecondaryContacts} />

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

        {/* Section: Contact Information */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                <User className="w-4 h-4 text-primary-500" />
                Primary Contact
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Contact Name</label>
                    <input
                        name="contactName"
                        defaultValue={(home as any).contactName || ''}
                        className={STYLES.input}
                        placeholder="Primary contact person"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Contact Position</label>
                    <input
                        name="contactPosition"
                        defaultValue={(home as any).contactPosition || ''}
                        className={STYLES.input}
                        placeholder="e.g. Activities Director"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Contact Phone</label>
                    <PhoneInput
                        name="contactPhone"
                        defaultValue={(home as any).contactPhone || ''}
                        className={STYLES.input}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Contact Email</label>
                    <input
                        name="contactEmail"
                        type="email"
                        defaultValue={(home as any).contactEmail || ''}
                        className={STYLES.input}
                        placeholder="Email address"
                    />
                </div>
                <div className="md:col-span-2 rounded-lg border border-gray-200 bg-gray-50/70 p-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            name="useCustomNotificationEmail"
                            checked={useCustomNotificationEmail}
                            onChange={(e) => setUseCustomNotificationEmail(e.target.checked)}
                            className="rounded text-primary-600"
                        />
                        <span className="text-sm font-medium text-gray-700">Send operational notifications to a different email</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">Booking and request notifications default to the primary contact email unless overridden here.</p>
                    {useCustomNotificationEmail && (
                        <div className="mt-3">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Notification Email</label>
                            <input
                                name="notificationEmail"
                                type="email"
                                required={useCustomNotificationEmail}
                                defaultValue={home.notificationEmail || ''}
                                className={STYLES.input}
                                placeholder="notifications@organization.com"
                            />
                        </div>
                    )}
                </div>

                <div className="md:col-span-2 rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-gray-900">Secondary Contacts</p>
                            <p className="text-xs text-gray-500">Add backup contacts for booking communication and urgent updates.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setContactsExpanded((prev) => !prev)}
                                className={cn(STYLES.btn, STYLES.btnSecondary, "text-xs")}
                            >
                                {contactsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                {contactsExpanded ? 'Minimize' : 'Expand'}
                            </button>
                            <button
                                type="button"
                                onClick={addSecondaryContact}
                                className={cn(STYLES.btn, STYLES.btnSecondary, "text-xs")}
                            >
                                Add Contact
                            </button>
                        </div>
                    </div>

                    {!contactsExpanded ? (
                        <p className="text-xs text-gray-500">Secondary contacts are minimized. Click Expand or Add Contact.</p>
                    ) : secondaryContacts.length === 0 ? (
                        <p className="text-xs text-gray-500">No secondary contacts added yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {secondaryContacts.map((contact, index) => (
                                <div key={index} className="border border-gray-100 rounded-lg p-3 bg-gray-50/40 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-medium text-gray-700">Contact #{index + 1}</p>
                                        <button
                                            type="button"
                                            onClick={() => removeSecondaryContact(index)}
                                            className="text-xs text-red-600 hover:text-red-700"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <input
                                            value={contact.name}
                                            onChange={(e) => updateSecondaryContact(index, 'name', e.target.value)}
                                            className={STYLES.input}
                                            placeholder="Contact name"
                                        />
                                        <input
                                            value={contact.position}
                                            onChange={(e) => updateSecondaryContact(index, 'position', e.target.value)}
                                            className={STYLES.input}
                                            placeholder="Position"
                                        />
                                        <input
                                            type="email"
                                            value={contact.email}
                                            onChange={(e) => updateSecondaryContact(index, 'email', e.target.value)}
                                            className={STYLES.input}
                                            placeholder="Email"
                                        />
                                        <input
                                            type="tel"
                                            value={contact.phone}
                                            onChange={(e) => updateSecondaryContact(index, 'phone', e.target.value)}
                                            className={STYLES.input}
                                            placeholder="555-123-4567"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
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
        <div className="pt-3 flex items-center justify-between border-t border-gray-100">
            {error ? (
                <span className="text-sm text-red-600 flex items-center gap-1.5">
                    {error}
                </span>
            ) : infoMessage ? (
                <span className="text-sm text-blue-700 flex items-center gap-1.5">
                    {infoMessage}
                </span>
            ) : saved ? (
                <span className="text-sm text-green-600 flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    Saved
                </span>
            ) : <span className="text-sm text-gray-400">Unsaved changes</span>}
            <button 
                type="submit" 
                disabled={isPending}
                className={cn(STYLES.btn, STYLES.btnPrimary, "disabled:opacity-50")}
            >
                {isPending ? (
                    <>
                        <Save className="w-4 h-4 animate-pulse" />
                        Saving...
                    </>
                ) : (
                    <>
                        <Save className="w-4 h-4" />
                        Save Changes
                    </>
                )}
            </button>
        </div>
    </form>
  )
}
