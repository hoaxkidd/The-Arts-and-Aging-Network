'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from "next/image"
import Link from 'next/link'
import { X, Mail, Phone, MapPin, Briefcase, User as UserIcon, Activity, ClipboardList, AlertTriangle, Building2, Users, FileText, Check, ShieldAlert, Trash2, Save } from 'lucide-react'
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"
import type { UserRoleAssignment } from '@prisma/client'
import { ROLE_LABELS, ROLE_ORDER, isValidRole } from '@/lib/roles'
import { deleteUser, kickUser, setUserStatus } from '@/app/actions/user-management'
import { updateUserRoles } from '@/app/actions/user'

function formatDate(date: Date | string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
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
    roleAssignments?: UserRoleAssignment[]
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
  initialTab?: string
  isOpen: boolean
  onClose: () => void
  onUserUpdated?: (user: any) => void
  onUserDeleted?: (userId: string) => void
}

export function UserDetailModal({ user, initialTab, isOpen, onClose, onUserUpdated, onUserDeleted }: UserDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roleEditorOpen, setRoleEditorOpen] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [primaryRole, setPrimaryRole] = useState<string>('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const tabs = useMemo(() => {
    if (!user) return []
    const isHomeAdmin = user.role === 'HOME_ADMIN'
    const baseTabs = isHomeAdmin
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
    if (isHomeAdmin) return baseTabs
    return [
      ...baseTabs,
      { id: 'roles', label: 'Roles', icon: ShieldAlert },
    ]
  }, [user])

  useEffect(() => {
    if (!isOpen || !user) return
    const nextTab = initialTab && tabs.some((t) => t.id === initialTab) ? initialTab : 'overview'
    setActiveTab(nextTab)
  }, [initialTab, isOpen, tabs, user])

  useEffect(() => {
    if (!isOpen || !user) return
    const activeAssignments = (user.roleAssignments || []).filter((a) => a.isActive)
    const activeRoleList = activeAssignments.length > 0 ? activeAssignments.map((a) => a.role) : [user.role]
    const currentPrimaryRole =
      activeAssignments.find((a) => a.isPrimary)?.role || user.role
    setError(null)
    setIsSubmitting(false)
    setDeleteConfirmText('')
    setRoleEditorOpen(false)
    setSelectedRoles(activeRoleList)
    setPrimaryRole(currentPrimaryRole)
  }, [isOpen, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen || !user) return null

  const displayName = user.preferredName || user.name || 'Unknown User'

  // Parse JSON fields
  const parsedHealth = safeJsonParse<Record<string, any>>(user.healthInfo, {})
  const intake = safeJsonParse<Record<string, any>>(user.intakeAnswers, {})
  const ec = safeJsonParse<Record<string, any>>(user.emergencyContact, {})

  const isHomeAdmin = user.role === 'HOME_ADMIN'
  const home = user.geriatricHome

  // Parse additional contacts for Program Coordinator
  const additionalContacts = isHomeAdmin && home?.additionalContacts
    ? safeJsonParse<any[]>(home.additionalContacts, [])
    : []

  const activeAssignments = (user.roleAssignments || []).filter((a) => a.isActive)
  const activeRoleList = activeAssignments.length > 0 ? activeAssignments.map((a) => a.role) : [user.role]
  const currentPrimaryRole =
    activeAssignments.find((a) => a.isPrimary)?.role || user.role

  const statusBadgeClass =
    user.status === 'ACTIVE'
      ? STYLES.badgeSuccess
      : user.status === 'PENDING'
        ? STYLES.badgeWarning
        : user.status === 'SUSPENDED'
          ? STYLES.badgeDanger
          : STYLES.badgeNeutral

  const canMutate = user.status !== 'PENDING'

  const submitStatus = async (status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') => {
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await setUserStatus(user.id, status)
      if (result.error || !result.user) {
        setError(result.error || 'Failed to update status')
        return
      }
      onUserUpdated?.(result.user)
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitKick = async () => {
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await kickUser(user.id)
      if (result.error || !result.user) {
        setError(result.error || 'Failed to kick user')
        return
      }
      onUserUpdated?.(result.user)
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitDelete = async () => {
    setError(null)
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type DELETE to confirm')
      return
    }
    setIsSubmitting(true)
    try {
      const result = await deleteUser(user.id)
      if (result.error) {
        setError(result.error)
        return
      }
      onUserDeleted?.(user.id)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitRoles = async () => {
    setError(null)

    const normalizedSelected = selectedRoles.filter((r) => isValidRole(r))
    if (normalizedSelected.length === 0) {
      setError('Select at least one role')
      return
    }
    const primaryRoleValue = typeof primaryRole === 'string' && isValidRole(primaryRole) ? primaryRole : null
    if (!primaryRoleValue || !normalizedSelected.includes(primaryRoleValue)) {
      setError('Primary role must be one of the selected roles')
      return
    }

    setIsSubmitting(true)
    try {
      const fd = new FormData()
      for (const r of normalizedSelected) fd.append('roles', r)
      fd.set('primaryRole', primaryRoleValue)
      const result = await updateUserRoles(user.id, fd)
      if ((result as any)?.error) {
        setError((result as any).error)
        return
      }
      // Optimistically update modal-visible role + status badges.
      onUserUpdated?.({
        ...user,
        role: primaryRoleValue,
        roleAssignments: normalizedSelected.map((role) => ({
          id: `temp-${role}`,
          userId: user.id,
          role,
          isActive: true,
          isPrimary: role === primaryRoleValue,
        })),
      })
      setRoleEditorOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[650px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            {user.image ? (
              <Image
                src={user.image}
                alt={displayName}
                width={48}
                height={48}
                className="rounded-full object-cover border-2 border-white shadow-sm"
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
                <span className={cn(STYLES.badge, STYLES.badgeInfo)}>
                  {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
                </span>
                <span className={cn(STYLES.badge, statusBadgeClass)}>{user.status}</span>
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
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Admin Actions */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-gray-900">Admin actions</div>
              <Link
                href={`/admin/users/${user.id}`}
                className="text-xs font-semibold text-primary-700 hover:text-primary-900"
                onClick={onClose}
              >
                Open full profile
              </Link>
            </div>
            <div className="p-4 space-y-3">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-end">
                <div>
                  <label className="text-xs font-medium text-gray-600">Status</label>
                  <select
                    className={cn(STYLES.input, STYLES.select, "mt-1")}
                    value={user.status}
                    onChange={(e) => submitStatus(e.target.value as any)}
                    disabled={isSubmitting || !canMutate}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="PENDING">Pending signup</option>
                  </select>
                </div>

                <button
                  type="button"
                  className={cn(STYLES.btn, STYLES.btnSecondary, "w-full sm:w-auto")}
                  onClick={submitKick}
                  disabled={isSubmitting || !canMutate}
                  title="Suspend user. New sign-ins blocked; existing sessions may persist."
                >
                  <ShieldAlert className="w-4 h-4" />
                  Kick
                </button>

                <button
                  type="button"
                  className={cn(STYLES.btn, STYLES.btnDanger, "w-full sm:w-auto")}
                  onClick={submitDelete}
                  disabled={isSubmitting || deleteConfirmText !== 'DELETE'}
                  title="Permanent delete"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-amber-900">Kick behavior</p>
                  <p className="text-xs text-amber-800 mt-1">
                    Kick sets status to <span className="font-mono">SUSPENDED</span>. New sign-ins are blocked immediately. JWT sessions may persist until refresh/re-auth.
                  </p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-900">Delete confirmation</p>
                  <label className="block text-[11px] font-medium text-red-800 mt-1">Type <span className="font-mono font-bold">DELETE</span></label>
                  <input
                    className={cn(STYLES.input, "mt-1 font-mono")}
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Program Coordinator Overview */}
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
                  <p className="text-gray-500">No facility linked to this Program Coordinator.</p>
                </div>
              )}
            </div>
          )}

          {/* Program Coordinator Contacts Tab */}
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
                      <div className="flex items-center gap-4 mt-2 pl-12 text-xs text-gray-600">
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
                            <div className="flex items-center gap-4 mt-2 pl-12 text-xs text-gray-600">
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

          {/* Roles Tab (Team users) */}
          {activeTab === 'roles' && !isHomeAdmin && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Roles</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Primary controls default landing page.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRoleEditorOpen((v) => !v)}
                  className={cn(STYLES.btn, STYLES.btnSecondary, "h-9")}
                  disabled={isSubmitting}
                >
                  {roleEditorOpen ? 'Hide editor' : 'Edit roles'}
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {activeRoleList.map((r) => (
                    <span
                      key={r}
                      className={cn(STYLES.badge, r === currentPrimaryRole ? STYLES.badgeInfo : STYLES.badgeNeutral)}
                    >
                      {ROLE_LABELS[r as keyof typeof ROLE_LABELS] || r}{r === currentPrimaryRole ? ' (Primary)' : ''}
                    </span>
                  ))}
                </div>

                {roleEditorOpen && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="table-scroll-wrapper max-h-[320px]">
                      <table className={STYLES.table}>
                        <thead className="bg-gray-50">
                          <tr className={STYLES.tableHeadRow}>
                            <th className={STYLES.tableHeader}>Role</th>
                            <th className={cn(STYLES.tableHeader, "w-[140px]")}>Selected</th>
                            <th className={cn(STYLES.tableHeader, "w-[140px]")}>Primary</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {ROLE_ORDER.map((role) => {
                            const selected = selectedRoles.includes(role)
                            const isPrimary = primaryRole === role
                            return (
                              <tr key={role} className={STYLES.tableRow}>
                                <td className={STYLES.tableCell}>
                                  <div className="font-medium text-gray-900">{ROLE_LABELS[role]}</div>
                                </td>
                                <td className={STYLES.tableCell}>
                                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      onChange={(e) => {
                                        const next = e.target.checked
                                          ? Array.from(new Set([...selectedRoles, role]))
                                          : selectedRoles.filter((r) => r !== role)
                                        setSelectedRoles(next)
                                        if (!next.includes(primaryRole)) {
                                          setPrimaryRole(next[0] || '')
                                        }
                                      }}
                                      className="rounded border-gray-300"
                                      disabled={isSubmitting}
                                    />
                                    <span className="text-xs text-gray-500">Include</span>
                                  </label>
                                </td>
                                <td className={STYLES.tableCell}>
                                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                      type="radio"
                                      name="primaryRole"
                                      checked={isPrimary}
                                      onChange={() => setPrimaryRole(role)}
                                      className="border-gray-300"
                                      disabled={isSubmitting || !selected}
                                    />
                                    <span className="text-xs text-gray-500">Set</span>
                                  </label>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                      <p className="text-xs text-gray-500">
                        Choose roles, then select one primary.
                      </p>
                      <button
                        type="button"
                        className={cn(STYLES.btn, STYLES.btnPrimary, "w-full sm:w-auto")}
                        onClick={submitRoles}
                        disabled={isSubmitting}
                      >
                        <Save className="w-4 h-4" />
                        Save roles
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
                    {user.vulnerableSectorCheckRequired ? <ShieldAlert className="w-4 h-4 text-yellow-600 flex-shrink-0" /> : <X className="w-4 h-4 text-gray-400 flex-shrink-0" />}
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
            className={cn(STYLES.btn, STYLES.btnSecondary)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
