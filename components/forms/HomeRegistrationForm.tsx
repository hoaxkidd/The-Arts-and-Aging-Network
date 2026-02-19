'use client'

import { useState } from 'react'
import { registerGeriatricHome } from '@/app/actions/home-registration'
import { Building2, User, Phone, ShieldAlert, CheckCircle, ArrowRight, ArrowLeft, Mail, Lock, MapPin } from 'lucide-react'
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'

const FACILITY_TYPES = [
  { value: 'PCH', label: 'Personal Care Home (PCH)' },
  { value: 'LTC', label: 'Long Term Care (LTC)' },
  { value: 'RETIREMENT', label: 'Retirement Residence' },
  { value: 'ASSISTED', label: 'Assisted Living' },
  { value: 'MEMORY', label: 'Memory Care' },
  { value: 'COMMUNITY', label: 'Community Group' },
  { value: 'OTHER', label: 'Other' }
]

export function HomeRegistrationForm({ embedded }: { embedded?: boolean }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [address, setAddress] = useState('')

  const validateStep = (currentStep: number) => {
    const form = document.querySelector('form')
    if (!form) return false
    const stepContainer = form.querySelector(`div[data-step="${currentStep}"]`)
    if (!stepContainer) return false
    const inputs = stepContainer.querySelectorAll('input, textarea, select')
    let isValid = true
    inputs.forEach((input) => {
      if (!(input as HTMLInputElement).checkValidity()) {
        (input as HTMLInputElement).reportValidity()
        isValid = false
      }
    })
    return isValid
  }

  const handleNext = () => {
    if (validateStep(step)) setStep(prev => prev + 1)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validateStep(3)) return

    setLoading(true)
    setError('')

    try {
      const formData = new FormData(e.currentTarget)
      const result = await registerGeriatricHome(formData)
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className={embedded ? "overflow-hidden" : "bg-white rounded-2xl shadow-xl overflow-hidden max-w-2xl mx-auto border border-gray-200"}>
      {/* Progress */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <span className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0",
              step >= s ? "bg-primary-600 text-white" : "bg-gray-200 text-gray-500"
            )}>
              {s}
            </span>
            {s < 3 && <div className={cn("h-1 flex-1 mx-2 rounded-full", step > s ? "bg-primary-600" : "bg-gray-200")} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6" noValidate>
        {/* Step 1: Account */}
        <div data-step="1" className={step === 1 ? 'block' : 'hidden'}>
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">Administrator Account</h2>
            <p className="text-sm text-gray-500 mt-0.5">Create your login credentials for managing the facility.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input name="name" required className={cn(STYLES.input, "pl-10")} placeholder="John Doe" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" name="email" required className={cn(STYLES.input, "pl-10")} placeholder="admin@facility.com" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="password" name="password" required minLength={8} className={cn(STYLES.input, "pl-10")} placeholder="Min. 8 characters" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum 8 characters required</p>
            </div>
          </div>

          <div className="pt-6 flex justify-end">
            <button type="button" onClick={handleNext} className={cn(STYLES.btn, STYLES.btnPrimary, "flex items-center gap-2")}>
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step 2: Facility */}
        <div data-step="2" className={step === 2 ? 'block' : 'hidden'}>
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">Facility Information</h2>
            <p className="text-sm text-gray-500 mt-0.5">Basic details about your care home.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Facility Name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input name="homeName" required className={cn(STYLES.input, "pl-10")} placeholder="Sunrise Care Home" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Facility Type</label>
              <select name="facilityType" className={STYLES.input}>
                <option value="">Select type</option>
                {FACILITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Physical Address</label>
              <AddressAutocomplete
                name="address"
                value={address}
                onChange={setAddress}
                placeholder="123 Care Lane, City, Province..."
                required
                multiline
                countries={['ca']}
                className={cn(STYLES.input)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Residents</label>
                <input type="number" name="residentCount" required min={0} className={STYLES.input} placeholder="45" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Capacity</label>
                <input type="number" name="maxCapacity" required min={1} className={STYLES.input} placeholder="60" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Region / Area (optional)</label>
              <input name="region" className={STYLES.input} placeholder="e.g. North End, Downtown" />
            </div>
          </div>

          <div className="pt-6 flex justify-between">
            <button type="button" onClick={() => setStep(1)} className={cn(STYLES.btn, STYLES.btnSecondary, "flex items-center gap-2")}>
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button type="button" onClick={handleNext} className={cn(STYLES.btn, STYLES.btnPrimary, "flex items-center gap-2")}>
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step 3: Contact & Operations */}
        <div data-step="3" className={step === 3 ? 'block' : 'hidden'}>
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">Contacts & Operations</h2>
            <p className="text-sm text-gray-500 mt-0.5">Primary contact and operational details for program coordination.</p>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-primary-600" /> Primary Contact
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                  <input name="contactName" required className={STYLES.input} placeholder="Jane Smith" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Position / Title</label>
                  <input name="contactPosition" required className={STYLES.input} placeholder="Program Coordinator" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input name="contactEmail" type="email" required className={STYLES.input} placeholder="jane@facility.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input name="contactPhone" required className={STYLES.input} placeholder="(555) 123-4567" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" /> Emergency Protocols
              </label>
              <textarea name="emergencyProtocol" rows={3} className={STYLES.input} placeholder="Evacuation procedures, hospital transport, after-hours contact..." />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Special Considerations & Accessibility</label>
              <textarea name="specialNeeds" rows={3} className={STYLES.input} placeholder="Medical conditions, accessibility needs, noise sensitivity, mobility considerations..." />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Content / Trigger Warnings (optional)</label>
              <textarea name="triggerWarnings" rows={2} className={STYLES.input} placeholder="Topics or content to avoid (e.g. wartime themes, loud sounds)..." />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Photo & Media Permissions (optional)</label>
              <input name="photoPermissions" className={STYLES.input} placeholder="e.g. No face photos, signed consent on file" />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 text-red-700 p-4 text-sm flex items-center gap-2 border border-red-100">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="pt-6 flex justify-between">
            <button type="button" onClick={() => setStep(2)} className={cn(STYLES.btn, STYLES.btnSecondary, "flex items-center gap-2")}>
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button type="submit" disabled={loading} className={cn(STYLES.btn, "bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 disabled:opacity-50")}>
              {loading ? 'Registering...' : (
                <>Complete Registration <CheckCircle className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
