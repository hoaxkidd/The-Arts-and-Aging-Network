'use client'

import { useState, useEffect } from 'react'
import { Star, User, Briefcase, Phone, Activity, ClipboardList, FileText, Mail } from 'lucide-react'
import { updateStaffProfile } from '@/app/actions/staff'
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete'
import { DocumentManager } from './DocumentManager'
import { useRouter } from 'next/navigation'

type UserData = {
  id: string
  name: string | null
  email: string | null
  alternateEmail?: string | null
  pronouns: string | null
  preferredName: string | null
  phone: string | null
  address: string | null
  bio: string | null
  birthDate: Date | null
  emergencyContact: string | null
  emergencyAltPhone: string | null
  healthInfo: string | null
  intakeAnswers: string | null
  // Employment fields
  position: string | null
  employmentType: string | null
  employmentStatus: string | null
  startDate: Date | null
  region: string | null
  // Team fields
  teamId: string | null
  teamCode: string | null
  teamType: string | null
  tShirtSize: string | null
  supervisorId: string | null
  // Skills & Notes
  strengthsSkills: string | null
  supportNotes: string | null
  funFacts: string | null
  // Skill ratings
  facilitatingSkillRating: number | null
  creativeArtsSkillRating: number | null
  organizingSkillRating: number | null
  communicatingSkillRating: number | null
  mentoringSkillRating: number | null
  // Accommodations
  requiresAccommodation: boolean
  accommodationDetails: string | null
  // Compliance
  workplaceSafetyFormReceived: boolean
  codeOfConductReceived: boolean
  travelPolicyAcknowledged: boolean
  policeCheckReceived: boolean
  vulnerableSectorCheckRequired: boolean
  dementiaTrainingCompleted: boolean
  dementiaTrainingDate: Date | null
  dementiaTrainingTopupDate: Date | null
  // Documents & Signatures
  signatureOnFile: boolean
  signatureDate: Date | null
  headshotReceived: boolean
  bioReceived: boolean
}

type ProfileFormProps = {
  user: UserData
  documents?: { id: string; name: string; url: string; type: string; verified: boolean; createdAt: Date }[]
  isAdmin?: boolean
  visibleTabs?: string[]
  embedded?: boolean
  flat?: boolean
  showSaveButton?: boolean
}

export function ProfileForm({ user, documents, isAdmin = false, visibleTabs, embedded = false, flat = false, showSaveButton = true }: ProfileFormProps) {
  const [activeTab, setActiveTab] = useState('personal')
  const [isPending, setIsPending] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [address, setAddress] = useState(user.address || '')
  const router = useRouter()

  const ec = user.emergencyContact ? JSON.parse(user.emergencyContact) : {}
  const intake = user.intakeAnswers ? JSON.parse(user.intakeAnswers) : {}
  
  // Dynamic State for Intake
  const [skills, setSkills] = useState<string[]>(Array.isArray(intake.skills) ? intake.skills : [])
  const [newSkill, setNewSkill] = useState('')
  
  const [tasks, setTasks] = useState<{name: string, rating: number}[]>(Array.isArray(intake.tasks) ? intake.tasks : [])
  const [newTask, setNewTask] = useState('')
  const [newTaskRating, setNewTaskRating] = useState(5)

  // Sync state when user data changes (after refresh)
  useEffect(() => {
    const updatedIntake = user.intakeAnswers ? JSON.parse(user.intakeAnswers) : {}
    if (Array.isArray(updatedIntake.skills)) {
      setSkills(updatedIntake.skills)
    }
    if (Array.isArray(updatedIntake.tasks)) {
      setTasks(updatedIntake.tasks)
    }
  }, [user.intakeAnswers])
  useEffect(() => {
    setAddress(user.address || '')
  }, [user.address])

  function addSkill() {
    if (newSkill.trim()) {
        setSkills([...skills, newSkill.trim()])
        setNewSkill('')
    }
  }

  function removeSkill(index: number) {
    setSkills(skills.filter((_, i) => i !== index))
  }

  function addTask() {
    if (newTask.trim()) {
        setTasks([...tasks, { name: newTask.trim(), rating: newTaskRating }])
        setNewTask('')
        setNewTaskRating(5)
    }
  }

  function removeTask(index: number) {
    setTasks(tasks.filter((_, i) => i !== index))
  }

  const health = user.healthInfo ? JSON.parse(user.healthInfo) : {}

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatusMessage(null)
    setIsPending(true)

    try {
      const formData = new FormData(e.currentTarget)

      // Ensure any text still in the input is captured as a task
      let effectiveTasks = tasks
      if (newTask.trim()) {
        effectiveTasks = [
          ...tasks,
          { name: newTask.trim(), rating: newTaskRating }
        ]
      }

      // Serialize dynamic fields
      const skillsJson = JSON.stringify(skills)
      const tasksJson = JSON.stringify(effectiveTasks)
      formData.set('intake_skills', skillsJson)
      formData.set('intake_tasks', tasksJson)
      
      // Debug logging
      console.log('[ProfileForm] Submitting tasks:', effectiveTasks)
      console.log('[ProfileForm] Tasks JSON:', tasksJson)

      // Handle Health Info JSON
      const healthData = {
          allergies: formData.get('health_allergies'),
          dietary: formData.get('health_dietary'),
          mobility: formData.get('health_mobility'),
          medical: formData.get('health_medical'),
      }
      formData.set('healthInfo', JSON.stringify(healthData))

      const result = await updateStaffProfile(formData)
      if (result?.error) {
        setStatusMessage(result.error)
      } else {
        setStatusMessage('Profile saved.')
        router.refresh() // Sync sidebar and other UI
      }
    } catch (err) {
      console.error('Form submission error:', err)
      setStatusMessage('Error saving profile. Please try again.')
    } finally {
      setIsPending(false)
    }
  }

  const allTabs = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'contact', label: 'Contact & Emergency', icon: Mail },
    { id: 'employment', label: 'Employment & Team', icon: Briefcase },
    { id: 'compliance', label: 'Compliance', icon: FileText },
    { id: 'skills', label: 'Skills & Notes', icon: ClipboardList },
    { id: 'intake', label: 'Intake', icon: Star },
    { id: 'health', label: 'Health Info', icon: Activity },
    { id: 'documents', label: 'Documents', icon: FileText },
  ]

  const tabs = visibleTabs
    ? allTabs.filter(t => visibleTabs.includes(t.id))
    : allTabs

  // Ensure active tab is valid for visible tabs
  const validActiveTab = tabs.find(t => t.id === activeTab) ? activeTab : tabs[0]?.id || 'personal'

  // Helper to check if a section should be shown
  const showSection = (id: string) => !visibleTabs || visibleTabs.includes(id)

  // Flat mode: render all visible sections stacked vertically without tabs
  if (flat) {
    return (
      <div className={embedded ? '' : 'bg-white rounded-lg border border-gray-200 overflow-hidden'}>
        <div className="p-4" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="userId" value={user.id} />

            {/* Contact & Emergency */}
            {showSection('contact') && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Mail className="w-4 h-4 text-primary-500" />
                  Contact Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input name="email" type="email" disabled defaultValue={user.email || ''} placeholder="No email on file" className="w-full rounded-lg border-gray-300 bg-gray-50 text-gray-500" />
                    <p className="text-xs text-gray-400 mt-1">Email cannot be changed here</p>
                  </div>
                  {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Email</label>
                    <input name="alternateEmail" type="email" defaultValue={user.alternateEmail || ''} placeholder="Alternate email address" className="w-full rounded-lg border-gray-300" />
                  </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input name="phone" defaultValue={user.phone || ''} placeholder="(555) 123-4567" className="w-full rounded-lg border-gray-300" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mailing Address</label>
                    <AddressAutocomplete name="address" value={address} onChange={setAddress} placeholder="Full mailing address" countries={['ca']} className="w-full rounded-lg border-gray-300" />
                  </div>
                  
                  {/* Emergency Contact Section - merged */}
                  <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Emergency Contact</h4>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                    <input name="ec_name" defaultValue={ec.name || ''} className="w-full rounded-lg border-gray-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                    <input name="ec_relation" defaultValue={ec.relation || ''} className="w-full rounded-lg border-gray-300" placeholder="e.g. Mother" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input name="ec_phone" defaultValue={ec.phone || ''} className="w-full rounded-lg border-gray-300" />
                  </div>
                </div>
              </div>
            )}

            {/* Emergency Contact */}
            {showSection('emergency') && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Phone className="w-4 h-4 text-primary-500" />
                  Emergency Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                    <input name="ec_name" defaultValue={ec.name || ''} className="w-full rounded-lg border-gray-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                    <input name="ec_relation" defaultValue={ec.relation || ''} className="w-full rounded-lg border-gray-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input name="ec_phone" defaultValue={ec.phone || ''} className="w-full rounded-lg border-gray-300" />
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            {showSaveButton && (
            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
            )}
          </form>

          {/* Documents (outside form since it has its own actions) */}
          {showSection('documents') && (
            <div className="mt-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                <FileText className="w-4 h-4 text-primary-500" />
                Documents
              </h3>
              <DocumentManager documents={documents || []} />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Standard tabbed mode
  return (
    <div className={embedded ? '' : 'bg-white rounded-lg border border-gray-200 overflow-hidden'}>
      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => {
            const Icon = tab.icon
            return (
                <button
                    type="button"
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-3 text-sm font-medium whitespace-nowrap flex items-center gap-2 transition-all ${
                        validActiveTab === tab.id
                        ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                </button>
            )
        })}
      </div>

        <div className="p-4" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
        {validActiveTab === 'documents' ? (
          <div className="space-y-4">
             <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                <h3 className="font-semibold text-blue-900 mb-2">My Documents</h3>
                <p className="text-sm text-blue-800">
                    Upload certifications, tax forms, and other required documents here.
                </p>
             </div>
             <DocumentManager documents={documents || []} />
             
             {isAdmin && (
                 <div className="border-t border-gray-200 pt-6 mt-6">
                     <h3 className="font-semibold text-gray-900 mb-4">Document Tracking</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="flex items-center gap-2">
                             <input type="checkbox" name="signatureOnFile" id="signatureOnFile" defaultChecked={user.signatureOnFile} className="rounded border-gray-300" />
                             <label htmlFor="signatureOnFile" className="text-sm text-gray-700">Signature on file</label>
                         </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Signature Date</label>
                             <input 
                                 type="date" 
                                 name="signatureDate" 
                                 defaultValue={user.signatureDate ? new Date(user.signatureDate).toISOString().split('T')[0] : ''} 
                                 className="w-full rounded-lg border-gray-300" 
                             />
                         </div>
                         <div className="flex items-center gap-2">
                             <input type="checkbox" name="headshotReceived" id="headshotReceived" defaultChecked={user.headshotReceived} className="rounded border-gray-300" />
                             <label htmlFor="headshotReceived" className="text-sm text-gray-700">Headshot received</label>
                         </div>
                         <div className="flex items-center gap-2">
                             <input type="checkbox" name="bioReceived" id="bioReceived" defaultChecked={user.bioReceived} className="rounded border-gray-300" />
                             <label htmlFor="bioReceived" className="text-sm text-gray-700">Bio received</label>
                         </div>
                     </div>
                 </div>
             )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="userId" value={user.id} />
            {/* Contact & Emergency Tab */}
            <div className={validActiveTab === 'contact' ? 'block' : 'hidden'}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input name="email" type="email" disabled defaultValue={user.email || ''} placeholder="No email on file" className="w-full rounded-lg border-gray-300 bg-gray-50 text-gray-500" />
                        <p className="text-xs text-gray-400 mt-1">Email cannot be changed here</p>
                    </div>
                    {isAdmin && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Email</label>
                        <input name="alternateEmail" type="email" defaultValue={user.alternateEmail || ''} placeholder="Alternate email address" className="w-full rounded-lg border-gray-300" />
                    </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <input name="phone" defaultValue={user.phone || ''} placeholder="(555) 123-4567" className="w-full rounded-lg border-gray-300" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mailing Address</label>
                        <input name="address" defaultValue={user.address || ''} placeholder="Full mailing address" className="w-full rounded-lg border-gray-300" />
                    </div>
                    {isAdmin && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">T-Shirt Size</label>
                            <select name="tShirtSize" defaultValue={user.tShirtSize || ''} className="w-full rounded-lg border-gray-300">
                                <option value="">—</option>
                                <option value="XS">XS</option>
                                <option value="Small">Small</option>
                                <option value="Medium">Medium</option>
                                <option value="Large">Large</option>
                                <option value="XL">XL</option>
                                <option value="XXL">XXL</option>
                            </select>
                        </div>
                    )}
                    
                    {/* Emergency Contact Section */}
                    <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Emergency Contact</h4>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                        <input name="ec_name" defaultValue={ec.name || ''} className="w-full rounded-lg border-gray-300" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                        <input name="ec_relation" defaultValue={ec.relation || ''} placeholder="e.g. Mother, Father, Spouse" className="w-full rounded-lg border-gray-300" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <input name="ec_phone" defaultValue={ec.phone || ''} className="w-full rounded-lg border-gray-300" />
                    </div>
                    {isAdmin && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Phone</label>
                            <input name="ec_alt_phone" defaultValue={user.emergencyAltPhone || ''} className="w-full rounded-lg border-gray-300" />
                        </div>
                    )}
                </div>
            </div>

            {/* Personal Tab */}
            <div className={validActiveTab === 'personal' ? 'block' : 'hidden'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Legal Name</label>
                    <input name="name" disabled={!isAdmin} defaultValue={user.name || ''} className={`w-full rounded-lg border-gray-300 ${!isAdmin && 'bg-gray-50 text-gray-500'}`} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Name</label>
                    <input name="preferredName" defaultValue={user.preferredName || ''} className="w-full rounded-lg border-gray-300" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pronouns</label>
                    <select 
                      name="pronouns" 
                      defaultValue={user.pronouns || ''} 
                      className="w-full rounded-lg border-gray-300"
                      onChange={(e) => {
                        const otherInput = document.getElementById('pronouns-other-input') as HTMLInputElement
                        if (otherInput) {
                          otherInput.style.display = e.target.value === 'Other' ? 'block' : 'none'
                        }
                      }}
                    >
                      <option value="">Prefer not to say</option>
                      <option value="She/Her">She/Her</option>
                      <option value="He/Him">He/Him</option>
                      <option value="They/Them">They/Them</option>
                      <option value="Other">Other</option>
                    </select>
                    <input 
                      id="pronouns-other-input"
                      name="pronouns_other" 
                      defaultValue={!['She/Her', 'He/Him', 'They/Them', ''].includes(user.pronouns || '') ? (user.pronouns || '') : ''}
                      placeholder="Enter your pronouns"
                      style={{ display: !['She/Her', 'He/Him', 'They/Them', ''].includes(user.pronouns || '') ? 'block' : 'none' }}
                      className="w-full rounded-lg border-gray-300 mt-2"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input type="date" name="birthDate" defaultValue={user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : ''} className="w-full rounded-lg border-gray-300" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
                    <AddressAutocomplete name="address" value={address} onChange={setAddress} placeholder="Full address" countries={['ca']} className="w-full rounded-lg border-gray-300" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Short Bio</label>
                    <textarea name="bio" rows={3} defaultValue={user.bio || ''} className="w-full rounded-lg border-gray-300" />
                </div>
            </div>
        </div>

        {/* Employment & Team Tab */}
        <div className={validActiveTab === 'employment' ? 'block' : 'hidden'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!isAdmin && (
                    <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-100 mb-2">
                        <p className="text-sm text-blue-800">
                            Employment information is managed by administrators. Contact your supervisor to make changes.
                        </p>
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Position / Job Title</label>
                    <input
                        name="position"
                        disabled={!isAdmin}
                        defaultValue={user.position || ''}
                        className={`w-full rounded-lg border-gray-300 ${!isAdmin && 'bg-gray-50 text-gray-500'}`}
                        placeholder={isAdmin ? "e.g., Senior Facilitator" : "Not assigned"}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                    <input
                        name="employmentType"
                        disabled={!isAdmin}
                        defaultValue={user.employmentType || ''}
                        className={`w-full rounded-lg border-gray-300 ${!isAdmin && 'bg-gray-50 text-gray-500'}`}
                        placeholder={isAdmin ? "e.g., Full-time, Part-time" : "Not specified"}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
                    <input
                        name="employmentStatus"
                        disabled={!isAdmin}
                        defaultValue={user.employmentStatus || 'Active'}
                        className={`w-full rounded-lg border-gray-300 ${!isAdmin && 'bg-gray-50 text-gray-500'}`}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                        type={isAdmin ? "date" : "text"}
                        name="startDate"
                        disabled={!isAdmin}
                        defaultValue={user.startDate ? new Date(user.startDate).toISOString().split('T')[0] : ''}
                        className={`w-full rounded-lg border-gray-300 ${!isAdmin && 'bg-gray-50 text-gray-500'}`}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Region / Location</label>
                    <input
                        name="region"
                        defaultValue={user.region || ''}
                        placeholder="e.g., Western, Central, Eastern"
                        className="w-full rounded-lg border-gray-300"
                    />
                </div>
                
                {/* Team Section - Admin only */}
                {isAdmin && (
                    <>
                        <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Team Information</h4>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Team ID</label>
                            <input
                                name="teamId"
                                defaultValue={user.teamId || ''}
                                placeholder="e.g., AAN-000001"
                                className="w-full rounded-lg border-gray-300"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Team Code</label>
                            <input
                                name="teamCode"
                                defaultValue={user.teamCode || ''}
                                placeholder="e.g., NH-01"
                                className="w-full rounded-lg border-gray-300"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Team Type</label>
                            <select name="teamType" defaultValue={user.teamType || ''} className="w-full rounded-lg border-gray-300">
                                <option value="">—</option>
                                <option value="Employee">Employee</option>
                                <option value="Contractor">Contractor</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor (User ID or Name)</label>
                            <input
                                name="supervisorId"
                                defaultValue={user.supervisorId || ''}
                                placeholder="Enter supervisor name or ID"
                                className="w-full rounded-lg border-gray-300"
                            />
                        </div>
                    </>
                )}
            </div>
        </div>

        {/* Intake Tab */}
        <div className={validActiveTab === 'intake' ? 'block' : 'hidden'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Skills Section */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Top Strengths & Skills</label>
                    <div className="flex gap-2 mb-3">
                        <input
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                            placeholder="Add a skill..."
                            className="flex-1 rounded-lg border-gray-300 text-sm"
                        />
                        <button type="button" onClick={addSkill} className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm font-medium">+</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {skills.map((skill, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                                {skill}
                                <button type="button" onClick={() => removeSkill(i)} className="hover:text-blue-900">×</button>
                            </span>
                        ))}
                        {skills.length === 0 && <span className="text-xs text-gray-400 italic">No skills added yet.</span>}
                    </div>
                </div>

                {/* Tasks Section */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Tasks (Rated 1-5)</label>
                    <div className="flex gap-2 mb-3">
                        <input
                            value={newTask}
                            onChange={(e) => setNewTask(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
                            placeholder="Add a task..."
                            className="flex-1 rounded-lg border-gray-300 text-sm"
                        />
                        <select 
                            value={newTaskRating}
                            onChange={(e) => setNewTaskRating(Number(e.target.value))}
                            className="rounded-lg border-gray-300 text-sm"
                        >
                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <button type="button" onClick={addTask} className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm font-medium">+</button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {tasks.map((task, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                                <span className="text-sm text-gray-800">{task.name}</span>
                                <div className="flex items-center gap-0.5">
                                    <div className="flex text-yellow-400">
                                        {Array.from({ length: 5 }).map((_, sIndex) => (
                                            <Star
                                                key={sIndex}
                                                className={`w-3 h-3 ${sIndex < task.rating ? 'fill-current' : 'text-gray-200 fill-gray-200'}`}
                                            />
                                        ))}
                                    </div>
                                    <button type="button" onClick={() => removeTask(i)} className="text-gray-400 hover:text-red-500 ml-2">×</button>
                                </div>
                            </div>
                        ))}
                        {tasks.length === 0 && <span className="text-xs text-gray-400 italic">No preferred tasks listed yet.</span>}
                    </div>
                </div>

                {/* Hobbies - Full Width */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hobbies & Fun Facts</label>
                    <textarea name="intake_hobbies" rows={2} defaultValue={intake.hobbies || ''} className="w-full rounded-lg border-gray-300" placeholder="Share something fun..." />
                </div>
            </div>
        </div>
        

        {/* Compliance Tab */}
        <div className={validActiveTab === 'compliance' ? 'block' : 'hidden'}>
            {!isAdmin ? (
                <div className="text-center py-8 text-gray-500">
                    Compliance information is managed by administrators.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Compliance Checklist</h4>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" name="workplaceSafetyFormReceived" id="workplaceSafetyFormReceived" defaultChecked={user.workplaceSafetyFormReceived} className="rounded border-gray-300" />
                        <label htmlFor="workplaceSafetyFormReceived" className="text-sm text-gray-700">Workplace safety form received</label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" name="codeOfConductReceived" id="codeOfConductReceived" defaultChecked={user.codeOfConductReceived} className="rounded border-gray-300" />
                        <label htmlFor="codeOfConductReceived" className="text-sm text-gray-700">Code of conduct received</label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" name="travelPolicyAcknowledged" id="travelPolicyAcknowledged" defaultChecked={user.travelPolicyAcknowledged} className="rounded border-gray-300" />
                        <label htmlFor="travelPolicyAcknowledged" className="text-sm text-gray-700">Internal controls & travel policy acknowledged</label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" name="policeCheckReceived" id="policeCheckReceived" defaultChecked={user.policeCheckReceived} className="rounded border-gray-300" />
                        <label htmlFor="policeCheckReceived" className="text-sm text-gray-700">Police check received</label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" name="vulnerableSectorCheckRequired" id="vulnerableSectorCheckRequired" defaultChecked={user.vulnerableSectorCheckRequired} className="rounded border-gray-300" />
                        <label htmlFor="vulnerableSectorCheckRequired" className="text-sm text-gray-700">Vulnerable sector check required</label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" name="dementiaTrainingCompleted" id="dementiaTrainingCompleted" defaultChecked={user.dementiaTrainingCompleted} className="rounded border-gray-300" />
                        <label htmlFor="dementiaTrainingCompleted" className="text-sm text-gray-700">Dementia engagement training completed</label>
                    </div>
                    
                    <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Training Dates</h4>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Training Completion Date</label>
                        <input 
                            type="date" 
                            name="dementiaTrainingDate" 
                            defaultValue={user.dementiaTrainingDate ? new Date(user.dementiaTrainingDate).toISOString().split('T')[0] : ''} 
                            className="w-full rounded-lg border-gray-300" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Training Top-up Renewal (2 yr)</label>
                        <input 
                            type="date" 
                            name="dementiaTrainingTopupDate" 
                            defaultValue={user.dementiaTrainingTopupDate ? new Date(user.dementiaTrainingTopupDate).toISOString().split('T')[0] : ''} 
                            className="w-full rounded-lg border-gray-300" 
                        />
                    </div>
                    
                    <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Accommodations</h4>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" name="requiresAccommodation" id="requiresAccommodation" defaultChecked={user.requiresAccommodation} className="rounded border-gray-300" />
                        <label htmlFor="requiresAccommodation" className="text-sm text-gray-700">Requires accommodations</label>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Accommodation Details</label>
                        <textarea name="accommodationDetails" rows={2} defaultValue={user.accommodationDetails || ''} className="w-full rounded-lg border-gray-300" />
                    </div>
                </div>
            )}
        </div>

        {/* Health Tab */}
        <div className={validActiveTab === 'health' ? 'block' : 'hidden'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 bg-yellow-50 p-4 rounded-lg border border-yellow-100 mb-2">
                    <p className="text-sm text-yellow-800">
                        This information helps us ensure your safety and provide appropriate accommodations.
                        It is kept confidential and shared only with relevant supervisors.
                    </p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
                    <input name="health_allergies" defaultValue={health.allergies || ''} placeholder="Peanuts, Latex, Bees..." className="w-full rounded-lg border-gray-300" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dietary Restrictions</label>
                    <input name="health_dietary" defaultValue={health.dietary || ''} placeholder="Vegetarian, Gluten-free..." className="w-full rounded-lg border-gray-300" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobility / Accessibility Needs</label>
                    <textarea name="health_mobility" rows={3} defaultValue={health.mobility || ''} placeholder="Ramp access required, etc." className="w-full rounded-lg border-gray-300" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medical Conditions (Optional)</label>
                    <textarea name="health_medical" rows={3} defaultValue={health.medical || ''} placeholder="Relevant medical info..." className="w-full rounded-lg border-gray-300" />
                </div>
            </div>
        </div>

        {/* Skills & Notes Tab */}
        <div className={validActiveTab === 'skills' ? 'block' : 'hidden'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isAdmin && (
                    <>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Strengths / Skills</label>
                            <textarea 
                                name="strengthsSkills" 
                                rows={2} 
                                defaultValue={user.strengthsSkills || ''} 
                                className="w-full rounded-lg border-gray-300" 
                                placeholder="e.g. Musical instruments, vocals, amicable" 
                            />
                        </div>
                        
                        {/* Skill Ratings - Inline Layout */}
                        <div className="md:col-span-2 flex items-center justify-between gap-4">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Facilitating Groups (1-5)</label>
                            <input type="number" name="facilitatingSkillRating" min="1" max="5" defaultValue={user.facilitatingSkillRating || ''} placeholder="1-5" className="w-20 rounded-lg border-gray-300" />
                        </div>
                        <div className="md:col-span-2 flex items-center justify-between gap-4">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Creative Arts (1-5)</label>
                            <input type="number" name="creativeArtsSkillRating" min="1" max="5" defaultValue={user.creativeArtsSkillRating || ''} placeholder="1-5" className="w-20 rounded-lg border-gray-300" />
                        </div>
                        <div className="md:col-span-2 flex items-center justify-between gap-4">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Organizing (1-5)</label>
                            <input type="number" name="organizingSkillRating" min="1" max="5" defaultValue={user.organizingSkillRating || ''} placeholder="1-5" className="w-20 rounded-lg border-gray-300" />
                        </div>
                        <div className="md:col-span-2 flex items-center justify-between gap-4">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Communicating (1-5)</label>
                            <input type="number" name="communicatingSkillRating" min="1" max="5" defaultValue={user.communicatingSkillRating || ''} placeholder="1-5" className="w-20 rounded-lg border-gray-300" />
                        </div>
                        <div className="md:col-span-2 flex items-center justify-between gap-4">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Mentoring (1-5)</label>
                            <input type="number" name="mentoringSkillRating" min="1" max="5" defaultValue={user.mentoringSkillRating || ''} placeholder="1-5" className="w-20 rounded-lg border-gray-300" />
                        </div>
                        
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Support Needs / Notes</label>
                            <textarea name="supportNotes" rows={2} defaultValue={user.supportNotes || ''} className="w-full rounded-lg border-gray-300" />
                        </div>
                    </>
                )}
            </div>
        </div>

        {showSaveButton && (
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm text-gray-500 h-5">
            {statusMessage}
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
        )}
      </form>
      )}
      </div>
    </div>
  )
}
