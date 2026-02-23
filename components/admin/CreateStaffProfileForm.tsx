'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Mail, Phone, Activity, Briefcase, ClipboardList, FileCheck } from 'lucide-react'
import { createPlaceholderStaffUser } from '@/app/actions/staff-onboarding'
import { ROLE_ORDER, ROLE_LABELS } from '@/lib/roles'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'

const RATING_OPTIONS = [1, 2, 3, 4, 5]
const TSHIRT_SIZES = ['XS', 'Small', 'Medium', 'Large', 'XL', 'XXL']

export function CreateStaffProfileForm() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState('identity')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sections = [
    { id: 'identity', label: 'Identity & role', icon: User },
    { id: 'contact', label: 'Contact', icon: Mail },
    { id: 'emergency', label: 'Emergency & health', icon: Phone },
    { id: 'employment', label: 'Employment & compliance', icon: Briefcase },
    { id: 'skills', label: 'Skills & notes', icon: ClipboardList },
    { id: 'documents', label: 'Documents & signatures', icon: FileCheck },
  ]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsPending(true)
    const formData = new FormData(e.currentTarget)
    const result = await createPlaceholderStaffUser(formData)
    if (result?.error) {
      setError(result.error)
      setIsPending(false)
      return
    }
    if (result?.success && result?.userId) {
      router.push(`/admin/users/${result.userId}`)
      router.refresh()
      return
    }
    setIsPending(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users" className="text-gray-500 hover:text-gray-700 flex items-center gap-2 mb-3 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Create Staff Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Add a team member who has not signed up yet. After saving, send an invitation so they can set a password and activate their account.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section nav (compact) */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveSection(id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors',
                activeSection === id
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Identity & role */}
        <div className={cn('space-y-4', activeSection !== 'identity' && 'hidden')}>
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-4 h-4 text-primary-500" />
            Identity & role
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full legal name *</label>
              <input name="name" required className={STYLES.input} placeholder="e.g. Jane Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input name="email" type="email" required className={STYLES.input} placeholder="used for sign-in and invite" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select name="role" className={cn(STYLES.input, STYLES.select)} defaultValue="CONTRACTOR">
                {ROLE_ORDER.map((role) => (
                  <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team ID</label>
              <input name="teamId" className={STYLES.input} placeholder="e.g. AAN-000001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team code</label>
              <input name="teamCode" className={STYLES.input} placeholder="e.g. NH-01" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team type</label>
              <select name="teamType" className={cn(STYLES.input, STYLES.select)}>
                <option value="">—</option>
                <option value="Employee">Employee</option>
                <option value="Contractor">Contractor</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className={cn('space-y-4', activeSection !== 'contact' && 'hidden')}>
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary-500" />
            Contact
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred name</label>
              <input name="preferredName" className={STYLES.input} placeholder="e.g. Jane" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pronouns</label>
              <input name="pronouns" className={STYLES.input} placeholder="e.g. He/Him" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of birth</label>
              <input name="birthDate" type="date" className={STYLES.input} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input name="phone" type="tel" className={STYLES.input} placeholder="e.g. 709-123-4567" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input name="address" className={STYLES.input} placeholder="Street, city, province, postal code" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">T-shirt size</label>
              <select name="tShirtSize" className={cn(STYLES.input, STYLES.select)}>
                <option value="">—</option>
                {TSHIRT_SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Emergency & health */}
        <div className={cn('space-y-4', activeSection !== 'emergency' && 'hidden')}>
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary-500" />
            Emergency & health
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emergency contact name</label>
              <input name="ec_name" className={STYLES.input} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
              <input name="ec_relation" className={STYLES.input} placeholder="e.g. Mother" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emergency phone</label>
              <input name="ec_phone" type="tel" className={STYLES.input} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emergency alt phone</label>
              <input name="ec_alt_phone" type="tel" className={STYLES.input} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
              <input name="health_allergies" className={STYLES.input} placeholder="e.g. None" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medical conditions</label>
              <input name="health_medical" className={STYLES.input} placeholder="e.g. None" />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input type="checkbox" name="requiresAccommodation" id="requiresAccommodation" value="yes" className="rounded border-gray-300" />
              <label htmlFor="requiresAccommodation" className="text-sm text-gray-700">Requires accommodations</label>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Accommodation details</label>
              <textarea name="accommodationDetails" rows={2} className={STYLES.input} />
            </div>
          </div>
        </div>

        {/* Employment & compliance */}
        <div className={cn('space-y-4', activeSection !== 'employment' && 'hidden')}>
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary-500" />
            Employment & compliance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position / role title</label>
              <input name="position" className={STYLES.input} placeholder="e.g. Sunshine Singer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employment type</label>
              <input name="employmentType" className={STYLES.input} placeholder="e.g. Part-time" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employment status</label>
              <input name="employmentStatus" className={STYLES.input} placeholder="e.g. Active" defaultValue="Active" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
              <input name="startDate" type="date" className={STYLES.input} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor (user ID or name)</label>
              <input name="supervisorId" className={STYLES.input} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
              <input name="region" className={STYLES.input} placeholder="e.g. NL" />
            </div>
            <div className="md:col-span-2 text-sm font-medium text-gray-700 mb-2">Compliance</div>
            {[
              { name: 'workplaceSafetyFormReceived', label: 'Workplace safety form received' },
              { name: 'codeOfConductReceived', label: 'Code of conduct received' },
              { name: 'travelPolicyAcknowledged', label: 'Internal controls & travel policy acknowledged' },
              { name: 'policeCheckReceived', label: 'Police check received' },
              { name: 'vulnerableSectorCheckRequired', label: 'Vulnerable sector check required' },
              { name: 'dementiaTrainingCompleted', label: 'Dementia engagement training completed' },
            ].map(({ name, label }) => (
              <div key={name} className="flex items-center gap-2 md:col-span-2">
                <input type="checkbox" name={name} id={name} value="yes" className="rounded border-gray-300" />
                <label htmlFor={name} className="text-sm text-gray-700">{label}</label>
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Training completion date</label>
              <input name="dementiaTrainingDate" type="date" className={STYLES.input} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Training top-up renewal (2 yr)</label>
              <input name="dementiaTrainingTopupDate" type="date" className={STYLES.input} />
            </div>
          </div>
        </div>

        {/* Skills & notes */}
        <div className={cn('space-y-4', activeSection !== 'skills' && 'hidden')}>
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary-500" />
            Skills & notes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Strengths / skills</label>
              <textarea name="strengthsSkills" rows={2} className={STYLES.input} placeholder="e.g. Musical instruments, vocals, amicable" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Facilitating groups (1–5)</label>
              <select name="facilitatingSkillRating" className={cn(STYLES.input, STYLES.select)}>
                <option value="">—</option>
                {RATING_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Creative arts (1–5)</label>
              <select name="creativeArtsSkillRating" className={cn(STYLES.input, STYLES.select)}>
                <option value="">—</option>
                {RATING_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organizing (1–5)</label>
              <select name="organizingSkillRating" className={cn(STYLES.input, STYLES.select)}>
                <option value="">—</option>
                {RATING_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Communicating (1–5)</label>
              <select name="communicatingSkillRating" className={cn(STYLES.input, STYLES.select)}>
                <option value="">—</option>
                {RATING_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mentoring (1–5)</label>
              <select name="mentoringSkillRating" className={cn(STYLES.input, STYLES.select)}>
                <option value="">—</option>
                {RATING_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Support needs / notes</label>
              <textarea name="supportNotes" rows={2} className={STYLES.input} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Hobbies / fun facts</label>
              <textarea name="funFacts" rows={2} className={STYLES.input} placeholder="e.g. Musician; has a cute little brown dog" />
            </div>
          </div>
        </div>

        {/* Documents & signatures */}
        <div className={cn('space-y-4', activeSection !== 'documents' && 'hidden')}>
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-primary-500" />
            Documents & signatures
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" name="signatureOnFile" id="signatureOnFile" value="yes" className="rounded border-gray-300" />
              <label htmlFor="signatureOnFile" className="text-sm text-gray-700">Signature on file</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Signature date</label>
              <input name="signatureDate" type="date" className={STYLES.input} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" name="headshotReceived" id="headshotReceived" value="yes" className="rounded border-gray-300" />
              <label htmlFor="headshotReceived" className="text-sm text-gray-700">Headshot received</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" name="bioReceived" id="bioReceived" value="yes" className="rounded border-gray-300" />
              <label htmlFor="bioReceived" className="text-sm text-gray-700">Bio received</label>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={isPending}
            className={cn(STYLES.btn, STYLES.btnPrimary, isPending && 'opacity-70 cursor-not-allowed')}
          >
            {isPending ? 'Creating...' : 'Create Staff Profile'}
          </button>
          <Link href="/admin/users" className={cn(STYLES.btn, STYLES.btnSecondary)}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
