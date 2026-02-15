'use client'

import { useState } from 'react'
import { X, Mail, Phone, MapPin, Briefcase, User as UserIcon, Activity, ClipboardList, AlertTriangle, Building2, Users } from 'lucide-react'
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"

type UserDetailModalProps = {
  user: any
  isOpen: boolean
  onClose: () => void
}

export function UserDetailModal({ user, isOpen, onClose }: UserDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview')

  if (!isOpen || !user) return null

  const displayName = user.preferredName || user.name || 'Unknown User'

  // Parse JSON fields
  const health = user.healthInfo ? JSON.parse(user.healthInfo) : {}
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
        { id: 'employment', label: 'Employment', icon: Briefcase },
        { id: 'health', label: 'Health', icon: Activity },
        { id: 'intake', label: 'Intake', icon: ClipboardList },
      ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gray-50">
          <div className="flex items-center gap-4">
            {user.image ? (
              <img
                src={user.image}
                alt={displayName}
                className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-2xl font-bold border-2 border-white shadow-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isHomeAdmin && home ? home.name : displayName}
              </h2>
              <div className="flex items-center gap-2 mt-1">
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
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 gap-6">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors",
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                        {additionalContacts.map((person: any) => (
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
                              <a href={`mailto:${person.email}`} className="flex items-center gap-1 hover:text-primary-600">
                                <Mail className="w-3 h-3" /> {person.email}
                              </a>
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
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm font-medium text-gray-900">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm font-medium text-gray-900">{user.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg col-span-full">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Address</p>
                      <p className="text-sm font-medium text-gray-900">{user.address || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </section>

              {user.bio && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Bio</h3>
                  <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700">
                    {user.bio}
                  </div>
                </section>
              )}

              {(ec.name || ec.phone) && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Emergency Contact</h3>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900">{ec.name || 'Unknown'}</p>
                      <p className="text-sm text-red-700">{ec.relation} • {ec.phone}</p>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Employment Tab */}
          {activeTab === 'employment' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Position</p>
                  <p className="font-medium text-gray-900">{user.position || 'Not assigned'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Employment Type</p>
                  <p className="font-medium text-gray-900">{user.employmentType || 'Not specified'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <p className="font-medium text-gray-900">{user.employmentStatus || 'Active'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Start Date</p>
                  <p className="font-medium text-gray-900">
                    {user.startDate ? new Date(user.startDate).toLocaleDateString() : 'Not recorded'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Region</p>
                  <p className="font-medium text-gray-900">{user.region || 'Not specified'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Health Tab */}
          {activeTab === 'health' && (
            <div className="space-y-6">
              {(!health.allergies && !health.dietary && !health.mobility && !health.medical) ? (
                <div className="text-center py-8 text-gray-500">No health information provided.</div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {health.allergies && (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                      <p className="text-xs text-yellow-700 font-semibold mb-1">Allergies</p>
                      <p className="text-sm text-gray-900">{health.allergies}</p>
                    </div>
                  )}
                  {health.dietary && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                      <p className="text-xs text-green-700 font-semibold mb-1">Dietary Restrictions</p>
                      <p className="text-sm text-gray-900">{health.dietary}</p>
                    </div>
                  )}
                  {health.mobility && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-xs text-blue-700 font-semibold mb-1">Mobility Needs</p>
                      <p className="text-sm text-gray-900">{health.mobility}</p>
                    </div>
                  )}
                  {health.medical && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 font-semibold mb-1">Medical Conditions</p>
                      <p className="text-sm text-gray-900">{health.medical}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Intake Tab */}
          {activeTab === 'intake' && (
            <div className="space-y-6">
              {/* Skills */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Skills & Strengths</h4>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(intake.skills) && intake.skills.length > 0 ? (
                    intake.skills.map((skill: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500 italic">No skills listed</span>
                  )}
                </div>
              </div>

              {/* Tasks */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Task Preferences</h4>
                <div className="space-y-2">
                  {Array.isArray(intake.tasks) && intake.tasks.length > 0 ? (
                    intake.tasks.map((task: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-900">{task.name}</span>
                        <div className="flex text-yellow-400">
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
              </div>

              {/* Hobbies */}
              {intake.hobbies && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Hobbies</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{intake.hobbies}</p>
                </div>
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
