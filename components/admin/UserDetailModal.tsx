'use client'

import { useState } from 'react'
import { X, Mail, Phone, MapPin, Briefcase, User as UserIcon, Activity, ClipboardList, AlertTriangle, Building2, Users, FileText, Check, Shield } from 'lucide-react'
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"

function formatDate(date: Date | string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

type UserDetailModalProps = {
  user: {
    id: string
    name: string | null
    email: string | null
    alternateEmail?: string | null
    image: string | null
    role: string
    status: string
    preferredName: string | null
    phone: string | null
    address: string | null
    bio: string | null
    birthDate: Date | null
    emergencyContact: string | null
    emergencyAltPhone: string | null
    healthInfo: string | null
    intakeAnswers: string | null
    position: string | null
    employmentType: string | null
    employmentStatus: string | null
    startDate: Date | null
    region: string | null
    tShirtSize: string | null
    teamId: string | null
    teamCode: string | null
    teamType: string | null
    supervisorId: string | null
    strengthsSkills: string | null
    supportNotes: string | null
    funFacts: string | null
    facilitatingSkillRating: number | null
    creativeArtsSkillRating: number | null
    organizingSkillRating: number | null
    communicatingSkillRating: number | null
    mentoringSkillRating: number | null
    requiresAccommodation: boolean
    accommodationDetails: string | null
    workplaceSafetyFormReceived: boolean
    codeOfConductReceived: boolean
    travelPolicyAcknowledged: boolean
    policeCheckReceived: boolean
    vulnerableSectorCheckRequired: boolean
    dementiaTrainingCompleted: boolean
    dementiaTrainingDate: Date | null
    dementiaTrainingTopupDate: Date | null
    signatureOnFile: boolean
    signatureDate: Date | null
    headshotReceived: boolean
    bioReceived: boolean
    geriatricHome?: {
      name: string
      address: string
      type: string | null
      region: string | null
      residentCount: number
      maxCapacity: number
      contactName: string
      contactEmail: string
      contactPhone: string
      contactPosition: string | null
      additionalContacts: string | null
      isPartner: boolean
      newsletterSub: boolean
    } | null
  } | null
  isOpen: boolean
  onClose: () => void
}

export function UserDetailModal({ user, isOpen, onClose }: UserDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview')

  if (!isOpen || !user) return null

  const displayName = user.preferredName || user.name || 'Unknown User'

  // Parse JSON fields
  const parsedHealth = user.healthInfo ? JSON.parse(user.healthInfo) : {}
  const intake = user.intakeAnswers ? JSON.parse(user.intakeAnswers) : {}
  const ec = user.emergencyContact ? JSON.parse(user.emergencyContact) : {}

  const isHomeAdmin = user.role === 'HOME_ADMIN'
  const home = user.geriatricHome

  // Parse additional contacts for Home Admin
  const additionalContacts = isHomeAdmin && home?.additionalContacts
    ? JSON.parse(home.additionalContacts)
    : []

  const tabs = isHomeAdmin
    ? [
        { id: 'overview', label: 'Overview', icon: Building2 },
        { id: 'contacts', label: 'Contacts', icon: Users },
      ]
    : [
        { id: 'overview', label: 'Overview', icon: UserIcon },
        { id: 'employment', label: 'Employment & Team', icon: Briefcase },
        { id: 'compliance', label: 'Compliance', icon: FileText },
        { id: 'skills', label: 'Skills & Notes', icon: ClipboardList },
        { id: 'health', label: 'Health', icon: Activity },
      ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[650px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={displayName}
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xl font-bold border-2 border-white shadow-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {isHomeAdmin && home ? home.name : displayName}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn(STYLES.badge, "bg-blue-100 text-blue-800 border-blue-200")}>
                  {user.role}
                </span>
                <span className={cn(STYLES.badge,
                  user.status === 'ACTIVE' ? 'bg-green-100 text-green-800 border-green-200' :
                  'bg-gray-100 text-gray-800 border-gray-200'
                )}>
                  {user.status}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-5 gap-4">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "py-3 text-base font-medium border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Home Admin Overview */}
          {activeTab === 'overview' && isHomeAdmin && (
            <div className="space-y-6">
              {home ? (
                <>
                  {/* Facility Details */}
                  <section>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Facility Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Building2 className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Facility Name</p>
                          <p className="text-sm font-medium text-gray-900">{home.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Users className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Capacity</p>
                          <p className="text-sm font-medium text-gray-900">{home.residentCount || 0} / {home.maxCapacity}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg col-span-full">
                        <MapPin className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Address</p>
                          <p className="text-sm font-medium text-gray-900">{home.address}</p>
                        </div>
                      </div>
                      {home.type && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Building2 className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Type</p>
                            <p className="text-sm font-medium text-gray-900">
                              {home.type === 'PCH' ? 'Personal Care Home' :
                               home.type === 'LTC' ? 'Long Term Care' :
                               home.type === 'SCHOOL' ? 'School' :
                               home.type === 'ARTS' ? 'Arts Organization' :
                               home.type === 'COMMUNITY' ? 'Community Group' :
                               home.type}
                            </p>
                          </div>
                        </div>
                      )}
                      {home.region && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <MapPin className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Region</p>
                            <p className="text-sm font-medium text-gray-900">{home.region}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Primary Contact */}
                  <section>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Primary Contact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <UserIcon className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Name</p>
                          <p className="text-sm font-medium text-gray-900">{home.contactName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Email</p>
                          <p className="text-sm font-medium text-gray-900">{home.contactEmail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Phone</p>
                          <p className="text-sm font-medium text-gray-900">{home.contactPhone}</p>
                        </div>
                      </div>
                      {home.contactPosition && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Briefcase className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Position</p>
                            <p className="text-sm font-medium text-gray-900">{home.contactPosition}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Status */}
                  <section>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Status</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          home.isPartner ? "bg-green-500" : "bg-gray-300"
                        )} />
                        <span className="text-gray-700">
                          {home.isPartner ? 'Partner' : 'Not a partner'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          home.newsletterSub ? "bg-green-500" : "bg-gray-300"
                        )} />
                        <span className="text-gray-700">
                          {home.newsletterSub ? 'Newsletter subscriber' : 'No newsletter'}
                        </span>
                      </div>
                    </div>
                  </section>
                </>
              ) : (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No facility linked to this Home Admin.</p>
                </div>
              )}
            </div>
          )}

          {/* Home Admin Contacts Tab */}
          {activeTab === 'contacts' && isHomeAdmin && (
            <div className="space-y-6">
              {home ? (
                <>
                  {/* Primary Contact */}
                  <section>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Primary Contact</h3>
                    <div className="p-3 rounded-lg bg-gradient-to-br from-primary-50 to-blue-50 border border-primary-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {home.contactName?.charAt(0)?.toUpperCase() || 'P'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900 text-sm">{home.contactName}</h4>
                            <span className="px-1.5 py-0.5 bg-primary-600 text-white rounded text-[10px] font-medium">Primary</span>
                          </div>
                          <p className="text-xs text-primary-600 mt-0.5">{home.contactPosition || 'Primary Contact'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 pl-13 text-xs text-gray-600">
                        <a href={`mailto:${home.contactEmail}`} className="flex items-center gap-1 hover:text-primary-600">
                          <Mail className="w-3 h-3" /> {home.contactEmail}
                        </a>
                        <a href={`tel:${home.contactPhone}`} className="flex items-center gap-1 hover:text-primary-600">
                          <Phone className="w-3 h-3" /> {home.contactPhone}
                        </a>
                      </div>
                    </div>
                  </section>

                  {/* Additional Contacts */}
                  <section>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Additional Contacts ({additionalContacts.length})
                    </h3>
                    {additionalContacts.length > 0 ? (
                      <div className="space-y-3">
                        {additionalContacts.map((person: { id?: string; name?: string; position?: string; email?: string; phone?: string }) => (
                          <div key={person.id} className="p-3 rounded-lg border border-gray-200 bg-white">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                {person.name?.charAt(0)?.toUpperCase() || 'U'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-gray-900 text-sm">{person.name}</h4>
                                <p className="text-xs text-gray-500 mt-0.5">{person.position || 'Staff Member'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-2 pl-13 text-xs text-gray-600">
                              {person.email && (
                              <a href={`mailto:${person.email}`} className="flex items-center gap-1 hover:text-primary-600">
                                <Mail className="w-3 h-3" /> {person.email}
                              </a>
                              )}
                              <a href={`tel:${person.phone}`} className="flex items-center gap-1 hover:text-primary-600">
                                <Phone className="w-3 h-3" /> {person.phone}
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <UserIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No additional contacts registered.</p>
                      </div>
                    )}
                  </section>
                </>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No facility linked — contacts unavailable.</p>
                </div>
              )}
            </div>
          )}

          {/* Standard User Overview Tab */}
          {activeTab === 'overview' && !isHomeAdmin && (
            <div className="space-y-5">
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm font-medium text-gray-900 break-all">{user.email || 'No email'}</p>
                    </div>
                  </div>
                  {user.alternateEmail && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Alternate Email</p>
                      <p className="text-sm font-medium text-gray-900 break-all">{user.alternateEmail}</p>
                    </div>
                  </div>
                  )}
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm font-medium text-gray-900">{user.phone || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg col-span-2">
                    <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Address</p>
                      <p className="text-sm font-medium text-gray-900">{user.address || '—'}</p>
                    </div>
                  </div>
                </div>
              </section>

              {user.bio && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">About</h3>
                  <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700 leading-relaxed">
                    {user.bio}
                  </div>
                </section>
              )}

              {(ec.name || ec.phone) && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Emergency Contact</h3>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900">{ec.name || 'Unknown'}</p>
                      <p className="text-sm text-red-700">{ec.relation} • {ec.phone}</p>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Employment & Team Tab */}
          {activeTab === 'employment' && (
            <div className="space-y-5">
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Employment Details</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Position</p>
                    <p className="text-sm font-medium text-gray-900">{user.position || '—'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Type</p>
                    <p className="text-sm font-medium text-gray-900">{user.employmentType || '—'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <p className="text-sm font-medium text-gray-900">{user.employmentStatus || 'Active'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Start Date</p>
                    <p className="text-sm font-medium text-gray-900">
                      {user.startDate ? formatDate(user.startDate) : '—'}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Region</p>
                    <p className="text-sm font-medium text-gray-900">{user.region || '—'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">T-Shirt</p>
                    <p className="text-sm font-medium text-gray-900">{user.tShirtSize || '—'}</p>
                  </div>
                </div>
              </section>
              
              {/* Team Information */}
              {(user.teamId || user.teamCode || user.teamType || user.supervisorId) && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Team Information</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {user.teamId && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Team ID</p>
                        <p className="text-sm font-medium text-gray-900">{user.teamId}</p>
                      </div>
                    )}
                    {user.teamCode && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Team Code</p>
                        <p className="text-sm font-medium text-gray-900">{user.teamCode}</p>
                      </div>
                    )}
                    {user.teamType && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Team Type</p>
                        <p className="text-sm font-medium text-gray-900">{user.teamType}</p>
                      </div>
                    )}
                    {user.supervisorId && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Supervisor</p>
                        <p className="text-sm font-medium text-gray-900">{user.supervisorId}</p>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Health Tab */}
          {activeTab === 'health' && (
            <div className="space-y-5">
              {(!parsedHealth.allergies && !parsedHealth.dietary && !parsedHealth.mobility && !parsedHealth.medical) ? (
                <div className="text-center py-12 text-gray-500 text-sm">No health information provided.</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {parsedHealth.allergies && (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-xs text-yellow-700 font-semibold mb-2">Allergies</p>
                      <p className="text-sm text-gray-900">{parsedHealth.allergies}</p>
                    </div>
                  )}
                  {parsedHealth.dietary && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs text-green-700 font-semibold mb-2">Dietary Restrictions</p>
                      <p className="text-sm text-gray-900">{parsedHealth.dietary}</p>
                    </div>
                  )}
                  {parsedHealth.mobility && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 col-span-2">
                      <p className="text-xs text-blue-700 font-semibold mb-2">Mobility / Accessibility Needs</p>
                      <p className="text-sm text-gray-900">{parsedHealth.mobility}</p>
                    </div>
                  )}
                  {parsedHealth.medical && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 col-span-2">
                      <p className="text-xs text-gray-500 font-semibold mb-2">Medical Conditions</p>
                      <p className="text-sm text-gray-900">{parsedHealth.medical}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Compliance Tab */}
          {activeTab === 'compliance' && (
            <div className="space-y-5">
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Compliance Checklist</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${user.workplaceSafetyFormReceived ? 'bg-green-50' : 'bg-gray-50'}`}>
                    {user.workplaceSafetyFormReceived ? <Check className="w-4 h-4 text-green-600 flex-shrink-0" /> : <X className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    <span className={`text-sm ${user.workplaceSafetyFormReceived ? 'text-green-800' : 'text-gray-500'}`}>Safety Form</span>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${user.codeOfConductReceived ? 'bg-green-50' : 'bg-gray-50'}`}>
                    {user.codeOfConductReceived ? <Check className="w-4 h-4 text-green-600 flex-shrink-0" /> : <X className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    <span className={`text-sm ${user.codeOfConductReceived ? 'text-green-800' : 'text-gray-500'}`}>Code of Conduct</span>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${user.travelPolicyAcknowledged ? 'bg-green-50' : 'bg-gray-50'}`}>
                    {user.travelPolicyAcknowledged ? <Check className="w-4 h-4 text-green-600 flex-shrink-0" /> : <X className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    <span className={`text-sm ${user.travelPolicyAcknowledged ? 'text-green-800' : 'text-gray-500'}`}>Travel Policy</span>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${user.policeCheckReceived ? 'bg-green-50' : 'bg-gray-50'}`}>
                    {user.policeCheckReceived ? <Check className="w-4 h-4 text-green-600 flex-shrink-0" /> : <X className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    <span className={`text-sm ${user.policeCheckReceived ? 'text-green-800' : 'text-gray-500'}`}>Police Check</span>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${user.vulnerableSectorCheckRequired ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                    {user.vulnerableSectorCheckRequired ? <Shield className="w-4 h-4 text-yellow-600 flex-shrink-0" /> : <X className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    <span className={`text-sm ${user.vulnerableSectorCheckRequired ? 'text-yellow-800' : 'text-gray-500'}`}>Vulnerable Sector</span>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${user.dementiaTrainingCompleted ? 'bg-green-50' : 'bg-gray-50'}`}>
                    {user.dementiaTrainingCompleted ? <Check className="w-4 h-4 text-green-600 flex-shrink-0" /> : <X className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    <span className={`text-sm ${user.dementiaTrainingCompleted ? 'text-green-800' : 'text-gray-500'}`}>Dementia Training</span>
                  </div>
                </div>
              </section>
              
              {(user.dementiaTrainingDate || user.dementiaTrainingTopupDate) && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Training Dates</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {user.dementiaTrainingDate && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Completion Date</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(user.dementiaTrainingDate)}</p>
                      </div>
                    )}
                    {user.dementiaTrainingTopupDate && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Top-up Renewal</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(user.dementiaTrainingTopupDate)}</p>
                      </div>
                    )}
                  </div>
                </section>
              )}
              
              {(user.requiresAccommodation || user.accommodationDetails) && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Accommodations</h3>
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">Requires Accommodation</span>
                    </div>
                    {user.accommodationDetails && (
                      <p className="text-sm text-gray-700">{user.accommodationDetails}</p>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Skills & Notes Tab */}
          {activeTab === 'skills' && (
            <div className="space-y-5">
              {/* Admin Skill Ratings */}
              {(user.strengthsSkills || user.facilitatingSkillRating) && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Skills & Ratings</h3>
                  {user.strengthsSkills && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-2">Strengths & Skills</p>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{user.strengthsSkills}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-5 gap-3">
                    {user.facilitatingSkillRating && (
                      <div className="p-3 bg-gray-50 rounded-lg text-center">
                        <p className="text-xs text-gray-500 mb-1">Facilitating</p>
                        <div className="flex text-yellow-400 justify-center text-sm">{'★'.repeat(user.facilitatingSkillRating)}{'☆'.repeat(5 - user.facilitatingSkillRating)}</div>
                      </div>
                    )}
                    {user.creativeArtsSkillRating && (
                      <div className="p-3 bg-gray-50 rounded-lg text-center">
                        <p className="text-xs text-gray-500 mb-1">Creative</p>
                        <div className="flex text-yellow-400 justify-center text-sm">{'★'.repeat(user.creativeArtsSkillRating)}{'☆'.repeat(5 - user.creativeArtsSkillRating)}</div>
                      </div>
                    )}
                    {user.organizingSkillRating && (
                      <div className="p-3 bg-gray-50 rounded-lg text-center">
                        <p className="text-xs text-gray-500 mb-1">Organizing</p>
                        <div className="flex text-yellow-400 justify-center text-sm">{'★'.repeat(user.organizingSkillRating)}{'☆'.repeat(5 - user.organizingSkillRating)}</div>
                      </div>
                    )}
                    {user.communicatingSkillRating && (
                      <div className="p-3 bg-gray-50 rounded-lg text-center">
                        <p className="text-xs text-gray-500 mb-1">Communicating</p>
                        <div className="flex text-yellow-400 justify-center text-sm">{'★'.repeat(user.communicatingSkillRating)}{'☆'.repeat(5 - user.communicatingSkillRating)}</div>
                      </div>
                    )}
                    {user.mentoringSkillRating && (
                      <div className="p-3 bg-gray-50 rounded-lg text-center">
                        <p className="text-xs text-gray-500 mb-1">Mentoring</p>
                        <div className="flex text-yellow-400 justify-center text-sm">{'★'.repeat(user.mentoringSkillRating)}{'☆'.repeat(5 - user.mentoringSkillRating)}</div>
                      </div>
                    )}
                  </div>
                </section>
              )}
              
              {/* Intake Skills */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Intake - Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(intake.skills) && intake.skills.length > 0 ? (
                    intake.skills.map((skill: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500 italic">No skills listed</span>
                  )}
                </div>
              </section>

              {/* Intake Tasks */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Task Preferences</h3>
                <div className="space-y-2">
                  {Array.isArray(intake.tasks) && intake.tasks.length > 0 ? (
                    intake.tasks.map((task: { name: string; rating: number }, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-900">{task.name}</span>
                        <div className="flex text-yellow-400 text-sm">
                          {Array.from({ length: 5 }).map((_, sIndex) => (
                            <span key={sIndex} className={sIndex < task.rating ? "fill-current" : "text-gray-200"}>★</span>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500 italic">No task preferences listed</span>
                  )}
                </div>
              </section>

              {/* Notes */}
              {(user.supportNotes || user.funFacts || intake.hobbies) && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Notes & Details</h3>
                  <div className="space-y-3">
                    {user.supportNotes && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1.5">Support Needs / Notes</p>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{user.supportNotes}</p>
                      </div>
                    )}
                    {user.funFacts && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1.5">Fun Facts</p>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{user.funFacts}</p>
                      </div>
                    )}
                    {intake.hobbies && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1.5">Hobbies</p>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{intake.hobbies}</p>
                      </div>
                    )}
                  </div>
                </section>
              )}
              
              {/* Document Status */}
              {(user.signatureOnFile || user.headshotReceived || user.bioReceived) && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Document Status</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className={`flex items-center justify-center gap-2 p-3 rounded-lg ${user.signatureOnFile ? 'bg-green-50' : 'bg-gray-50'}`}>
                      {user.signatureOnFile ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-gray-400" />}
                      <span className={`text-sm ${user.signatureOnFile ? 'text-green-800' : 'text-gray-500'}`}>Signature</span>
                    </div>
                    <div className={`flex items-center justify-center gap-2 p-3 rounded-lg ${user.headshotReceived ? 'bg-green-50' : 'bg-gray-50'}`}>
                      {user.headshotReceived ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-gray-400" />}
                      <span className={`text-sm ${user.headshotReceived ? 'text-green-800' : 'text-gray-500'}`}>Headshot</span>
                    </div>
                    <div className={`flex items-center justify-center gap-2 p-3 rounded-lg ${user.bioReceived ? 'bg-green-50' : 'bg-gray-50'}`}>
                      {user.bioReceived ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-gray-400" />}
                      <span className={`text-sm ${user.bioReceived ? 'text-green-800' : 'text-gray-500'}`}>Bio</span>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
