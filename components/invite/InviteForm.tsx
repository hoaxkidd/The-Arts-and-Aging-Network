'use client'

import { useState } from 'react'
import { CheckCircle, Eye, EyeOff, ChevronRight, ChevronLeft, Phone, User, Building, Briefcase, Users, Mail } from 'lucide-react'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'

interface InviteFormProps {
  invitation: {
    token: string
    email: string
    role: string
    userId?: string | null
  }
  bgBlobs: React.ReactNode
  onSubmit: (formData: FormData) => Promise<void>
  existingHomes?: { id: string; name: string }[]
}

const STEPS = [
  { id: 1, name: 'Account', icon: User },
  { id: 2, name: 'Contact', icon: Phone },
  { id: 3, name: 'Details', icon: Building },
  { id: 4, name: 'Review', icon: CheckCircle },
]

const ROLE_SPECIFIC_FIELDS: Record<string, { label: string; name: string; type: string; required: boolean; placeholder?: string; options?: string[] }[]> = {
  VOLUNTEER: [
    { label: 'Skills/Interests', name: 'skills', type: 'checkbox', required: false, options: ['Art', 'Music', 'Exercise', 'Social Activities', 'Reading', 'Gardening', 'Crafts', 'Technology'] },
    { label: 'How did you hear about us?', name: 'referralSource', type: 'text', required: false, placeholder: 'Friend, website, etc.' },
  ],
  FACILITATOR: [
    { label: 'Emergency Contact Name', name: 'emergencyContactName', type: 'text', required: true, placeholder: 'Emergency contact name' },
    { label: 'Emergency Contact Phone', name: 'emergencyContactPhone', type: 'tel', required: true, placeholder: '(555) 123-4567' },
    { label: 'Emergency Contact Relationship', name: 'emergencyContactRelationship', type: 'text', required: true, placeholder: 'Spouse, Parent, etc.' },
    { label: 'Position/Title', name: 'position', type: 'text', required: false, placeholder: 'Activity Coordinator' },
  ],
  HOME_ADMIN: [
    { label: 'Facility Name', name: 'facilityName', type: 'text', required: false, placeholder: 'Your facility name' },
  ],
  PARTNER: [
    { label: 'Organization Name', name: 'organizationName', type: 'text', required: true, placeholder: 'Your organization' },
    { label: 'Organization Type', name: 'organizationType', type: 'select', required: true, options: ['Healthcare', 'Community', 'Education', 'Non-Profit', 'Government', 'Other'] },
  ],
  PAYROLL: [
    { label: 'Position/Title', name: 'position', type: 'text', required: true, placeholder: 'Payroll Administrator' },
    { label: 'Employment Type', name: 'employmentType', type: 'select', required: true, options: ['Full-time', 'Part-time', 'Contract'] },
  ],
  BOARD: [
    { label: 'Board Position', name: 'boardPosition', type: 'text', required: true, placeholder: 'Chair, Secretary, etc.' },
    { label: 'Term Start Date', name: 'termStart', type: 'date', required: false },
  ],
  ADMIN: [],
}

export function InviteForm({ invitation, bgBlobs, onSubmit, existingHomes = [] }: InviteFormProps) {
  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [showEmailChange, setShowEmailChange] = useState(false)
  const [emailChangeRequested, setEmailChangeRequested] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    phone: '',
    skills: [] as string[],
    referralSource: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    position: '',
    employmentType: '',
    organizationName: '',
    organizationType: '',
    boardPosition: '',
    termStart: '',
    facilityName: '',
    selectedFacilityId: '',
    requestNewFacility: false,
    requestedEmail: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isHomeAdmin = invitation.role === 'HOME_ADMIN'
  const roleFields = isHomeAdmin ? [] : (ROLE_SPECIFIC_FIELDS[invitation.role] || [])

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (currentStep === 1) {
      if (!formData.name.trim()) newErrors.name = 'Name is required'
      if (!formData.password || formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters'
      if (showEmailChange && formData.requestedEmail.trim()) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.requestedEmail)) {
          newErrors.requestedEmail = 'Please enter a valid email address'
        }
      }
    }
    
    if (currentStep === 2) {
      if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
    }
    
    if (currentStep === 3) {
      // For HOME_ADMIN, validate facility selection
      if (isHomeAdmin) {
        if (!formData.requestNewFacility && !formData.selectedFacilityId) {
          newErrors.selectedFacilityId = 'Please select your facility'
        }
        if (formData.requestNewFacility && !formData.facilityName.trim()) {
          newErrors.facilityName = 'Facility name is required'
        }
      } else {
        roleFields.forEach(field => {
          if (field.required && !formData[field.name as keyof typeof formData]) {
            newErrors[field.name] = `${field.label} is required`
          }
        })
      }
    }
    
    if (currentStep === 4) {
      // Final validation - verify all critical fields have values
      if (!formData.name.trim()) newErrors.name = 'Name is required'
      if (!formData.password || formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters'
      if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
      
      // Validate role-specific required fields
      if (isHomeAdmin) {
        if (!formData.requestNewFacility && !formData.selectedFacilityId) {
          newErrors.selectedFacilityId = 'Please select your facility'
        }
        if (formData.requestNewFacility && !formData.facilityName.trim()) {
          newErrors.facilityName = 'Facility name is required'
        }
      } else {
        roleFields.forEach(field => {
          if (field.required && !formData[field.name as keyof typeof formData]) {
            newErrors[field.name] = `${field.label} is required`
          }
        })
      }
      
      // Validate email change request if submitted
      if (showEmailChange && formData.requestedEmail.trim()) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.requestedEmail)) {
          newErrors.requestedEmail = 'Please enter a valid email address'
        }
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    setStep(step - 1)
  }

  const handleSkillToggle = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }))
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            {/* Email Display Box */}
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-primary-900">Invited Email Address</p>
                  <p className="text-primary-700 font-medium">{invitation.email}</p>
                  {!showEmailChange && !emailChangeRequested && (
                    <button
                      type="button"
                      onClick={() => setShowEmailChange(true)}
                      className="text-sm text-primary-600 hover:underline mt-2"
                    >
                      Request to use a different email
                    </button>
                  )}
                </div>
              </div>
              
              {showEmailChange && !emailChangeRequested && (
                <div className="mt-4 pt-4 border-t border-primary-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    New Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.requestedEmail}
                    onChange={e => setFormData({ ...formData, requestedEmail: e.target.value })}
                    className={cn(STYLES.input, "py-2")}
                    placeholder="newemail@example.com"
                  />
                  {errors.requestedEmail && <p className="text-red-500 text-sm mt-1">{errors.requestedEmail}</p>}
                  <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> This request requires admin approval. 
                      If approved, a new invitation link will be sent to your new email address.
                    </p>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEmailChange(false)
                        setFormData({ ...formData, requestedEmail: '' })
                      }}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              {emailChangeRequested && (
                <div className="mt-4 pt-4 border-t border-primary-200">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Email change requested:</strong> {formData.requestedEmail}
                      <br />
                      Your request is pending admin approval.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className={cn(STYLES.input, "py-3")}
                placeholder="Jane Doe"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Set Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className={cn(STYLES.input, "py-3 pr-12")}
                  placeholder="••••••"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className={cn(STYLES.input, "py-3")}
                placeholder="(555) 123-4567"
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              <p className="text-gray-500 text-sm mt-2">Required for all team members</p>
            </div>
          </div>
        )

      case 3:
        // Special handling for HOME_ADMIN
        if (isHomeAdmin) {
          return (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Your Facility
                </label>
                {!formData.requestNewFacility ? (
                  <>
                    <select
                      value={formData.selectedFacilityId}
                      onChange={e => setFormData({ ...formData, selectedFacilityId: e.target.value })}
                      className={cn(STYLES.select, "py-3")}
                    >
                      <option value="">-- Select your facility --</option>
                      {existingHomes.map(home => (
                        <option key={home.id} value={home.id}>{home.name}</option>
                      ))}
                    </select>
                    {errors.selectedFacilityId && <p className="text-red-500 text-sm mt-1">{errors.selectedFacilityId}</p>}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, requestNewFacility: true })}
                      className="text-sm text-primary-600 hover:underline mt-2"
                    >
                      Or request a new facility
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      value={formData.facilityName}
                      onChange={e => setFormData({ ...formData, facilityName: e.target.value })}
                      className={cn(STYLES.input, "py-3")}
                      placeholder="Enter facility name"
                    />
                    {errors.facilityName && <p className="text-red-500 text-sm mt-1">{errors.facilityName}</p>}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, requestNewFacility: false })}
                      className="text-sm text-primary-600 hover:underline mt-2"
                    >
                      Or select existing facility
                    </button>
                  </>
                )}
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Your account will require admin approval before you can access the system. 
                  Once approved, you'll be linked to your facility.
                </p>
              </div>
            </div>
          )
        }
        
        if (roleFields.length === 0) {
          return (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">No additional information needed for your role.</p>
              <p className="text-gray-500 text-sm mt-2">Click Next to continue.</p>
            </div>
          )
        }
        return (
          <div className="space-y-5">
            {roleFields.map(field => (
              <div key={field.name}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                
                {field.type === 'checkbox' && field.options && (
                  <div className="flex flex-wrap gap-2">
                    {field.options.map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleSkillToggle(option)}
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          formData.skills.includes(option)
                            ? "bg-secondary-400 text-gray-900"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
                
                {field.type === 'select' && field.options && (
                  <select
                    value={formData[field.name as keyof typeof formData] as string}
                    onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                    className={cn(STYLES.select, "py-3")}
                  >
                    <option value="">Select {field.label}</option>
                    {field.options.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                )}
                
                {field.type !== 'checkbox' && field.type !== 'select' && (
                  <input
                    type={field.type}
                    value={formData[field.name as keyof typeof formData] as string}
                    onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                    className={cn(STYLES.input, "py-3")}
                    placeholder={field.placeholder}
                  />
                )}
                
                {errors[field.name] && <p className="text-red-500 text-sm mt-1">{errors[field.name]}</p>}
              </div>
            ))}
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">Review Your Information</h3>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{formData.name || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">{invitation.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phone:</span>
                <span className="font-medium">{formData.phone || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Role:</span>
                <span className="font-medium">{invitation.role}</span>
              </div>
              
              {formData.position && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Position:</span>
                  <span className="font-medium">{formData.position}</span>
                </div>
              )}
              
              {formData.organizationName && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Organization:</span>
                  <span className="font-medium">{formData.organizationName}</span>
                </div>
              )}
              
              {formData.skills.length > 0 && (
                <div>
                  <span className="text-gray-600 block">Skills/Interests:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {formData.skills.map(skill => (
                      <span key={skill} className="px-2 py-1 bg-secondary-200 text-gray-800 rounded text-xs">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (step < 4) {
      handleNext()
      return
    }
    
    // Validate step 4 before final submit
    if (!validateStep(4)) {
      return // Validation errors will be shown
    }
    
    // Final submit - create FormData and call onSubmit
    const fd = new FormData()
    fd.append('name', formData.name)
    fd.append('password', formData.password)
    fd.append('phone', formData.phone)
    fd.append('role', invitation.role)
    
    // Email change request
    if (showEmailChange && formData.requestedEmail.trim()) {
      fd.append('requestedEmail', formData.requestedEmail)
    }
    
    // Add role-specific fields
    if (formData.skills.length > 0) fd.append('skills', JSON.stringify(formData.skills))
    if (formData.referralSource) fd.append('referralSource', formData.referralSource)
    if (formData.emergencyContactName) fd.append('emergencyContactName', formData.emergencyContactName)
    if (formData.emergencyContactPhone) fd.append('emergencyContactPhone', formData.emergencyContactPhone)
    if (formData.emergencyContactRelationship) fd.append('emergencyContactRelationship', formData.emergencyContactRelationship)
    if (formData.position) fd.append('position', formData.position)
    if (formData.employmentType) fd.append('employmentType', formData.employmentType)
    if (formData.organizationName) fd.append('organizationName', formData.organizationName)
    if (formData.organizationType) fd.append('organizationType', formData.organizationType)
    if (formData.boardPosition) fd.append('boardPosition', formData.boardPosition)
    if (formData.termStart) fd.append('termStart', formData.termStart)
    
    // HOME_ADMIN specific fields
    if (isHomeAdmin) {
      if (formData.requestNewFacility) {
        fd.append('facilityName', formData.facilityName)
        fd.append('requestNewFacility', 'true')
      } else if (formData.selectedFacilityId) {
        fd.append('selectedFacilityId', formData.selectedFacilityId)
      }
    }
    
    await onSubmit(fd)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      {bgBlobs}
      
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-2xl p-6 border border-white/50">
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-6">
            {STEPS.map((s, idx) => (
              <div key={s.id} className="flex items-center">
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
                  step >= s.id 
                    ? "bg-secondary-400 text-gray-900" 
                    : "bg-gray-200 text-gray-500"
                )}>
                  {step > s.id ? <CheckCircle className="w-5 h-5" /> : <s.icon className="w-4 h-4" />}
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={cn(
                    "w-8 h-0.5 mx-1",
                    step > s.id ? "bg-secondary-400" : "bg-gray-200"
                  )} />
                )}
              </div>
            ))}
          </div>

          <div className="text-center mb-6">
            <div className="mx-auto w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mb-3">
              <CheckCircle className="w-7 h-7 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome Aboard</h2>
            <p className="mt-1 text-gray-600">Step {step} of 4: {STEPS[step - 1].name}</p>
            <div className="mt-2 inline-block px-3 py-1 bg-secondary-100 text-secondary-800 rounded-full text-sm font-medium border border-secondary-200">
              {invitation.role}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {renderStep()}
            
            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className={cn(STYLES.btn, STYLES.btnSecondary, "flex-1 py-3")}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </button>
              )}
              <button
                type="submit"
                className={cn(STYLES.btn, STYLES.btnPrimary, "flex-1 py-3")}
              >
                {step === 4 ? 'Create Account' : 'Next'}
                {step < 4 && <ChevronRight className="w-4 h-4 ml-1" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
