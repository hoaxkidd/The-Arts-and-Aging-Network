import { prisma } from "@/lib/prisma"
import { addSecondaryRole, cancelPendingEmailChange, removeSecondaryRole, setPrimaryRole, updateUser, updateUserEmployment, updateVolunteerReviewStatus } from "@/app/actions/user"
import { createFacilityProfile } from "@/app/actions/home-management"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, AlertTriangle, Building2, Plus, Settings } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"
import { ROLE_ORDER, ROLE_LABELS, isValidRole } from "@/lib/roles"
import DeleteUserButton from "@/components/admin/DeleteUserButton"
import { CreateFacilityForm } from "@/components/admin/CreateFacilityForm"
import { ProfileForm } from "@/components/staff/ProfileForm"
import { HomeProfileForm } from "@/components/dashboard/HomeProfileForm"
import { PersonnelManager } from "@/components/dashboard/PersonnelManager"
import { AdminUserTabs } from "@/components/admin/AdminUserTabs"

export default async function EditUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ accountError?: string; accountMessage?: string; employmentError?: string; employmentMessage?: string; roleError?: string; roleMessage?: string }>
}) {
  const { id } = await params
  const query = await searchParams
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id }, { userCode: id }],
    },
    include: {
      documents: true,
      geriatricHome: true,
      roleAssignments: {
        where: { isActive: true },
        orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }],
      },
    }
  })

  if (!user) return <div>User not found</div>
  const canonicalIdentifier = user.userCode || user.id
  if (id !== canonicalIdentifier) {
    redirect(`/admin/users/${canonicalIdentifier}`)
  }

  const pendingEmailChange = await prisma.emailChangeRequest.findFirst({
    where: {
      userId: user.id,
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  const isHomeAdmin = user.role === 'HOME_ADMIN'

  // Parse additional contacts for Home Admin
  let additionalContacts: Array<{ id: string; name: string; position: string; email: string; phone: string }> = []
  if (isHomeAdmin && user.geriatricHome?.additionalContacts) {
    try {
      const parsed = JSON.parse(user.geriatricHome.additionalContacts as string)
      if (Array.isArray(parsed)) {
        additionalContacts = parsed.map((contact, index) => ({
          id: typeof contact?.id === 'string' ? contact.id : `legacy-${index}`,
          name: typeof contact?.name === 'string' ? contact.name : '',
          position: typeof contact?.position === 'string' ? contact.position : '',
          email: typeof contact?.email === 'string' ? contact.email : '',
          phone: typeof contact?.phone === 'string' ? contact.phone : '',
        }))
      }
    } catch {
      additionalContacts = []
    }
  }

  return (
    <div className="space-y-4">
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </Link>
      {/* PENDING placeholder banner */}
      {user.status === 'PENDING' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-900">Pending signup</h3>
            <p className="text-sm text-amber-800 mt-0.5">
              This user has not signed up yet. They cannot log in until they accept an invitation and set a password.
              Send an invitation from the <Link href="/admin/invitations" className="font-medium underline hover:no-underline">Invitations</Link> page using their email to allow them to activate their account.
            </p>
          </div>
        </div>
      )}

      {query.accountError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
          {query.accountError}
        </div>
      )}

      {query.accountMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800">
          {query.accountMessage}
        </div>
      )}

      {query.employmentError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
          {query.employmentError}
        </div>
      )}

      {query.employmentMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800">
          {query.employmentMessage}
        </div>
      )}

      {query.roleError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
          {query.roleError}
        </div>
      )}

      {query.roleMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800">
          {query.roleMessage}
        </div>
      )}

      {/* Account Settings Bar */}
      <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
        <form action={async (formData) => {
          'use server'
          const result = await updateUser(user.id, formData)
          if (result?.error) {
            redirect(`/admin/users/${canonicalIdentifier}?accountError=${encodeURIComponent(result.error)}`)
          }
          if (result?.message) {
            redirect(`/admin/users/${canonicalIdentifier}?accountMessage=${encodeURIComponent(result.message)}`)
          }
          redirect(`/admin/users/${canonicalIdentifier}`)
        }} className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Settings className="w-4 h-4" />
            <span className="font-medium text-gray-700">Account:</span>
            <span className="font-mono text-xs bg-primary-50 text-primary-700 border border-primary-100 rounded px-2 py-1">
              {user.userCode || 'MISSING-ID'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Role</label>
            <select
              name="role"
              defaultValue={isValidRole(user.role) ? user.role : ROLE_ORDER[0]}
              className="text-sm rounded-md border-gray-300 py-1.5 pr-8 pl-2"
            >
              {ROLE_ORDER.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            {!isValidRole(user.role) && (
              <span className="text-xs text-amber-600">Current role &quot;{user.role}&quot; is invalid — please assign above.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Request Email</label>
            <input
              name="email"
              type="email"
              placeholder={user.email || 'new@example.com'}
              className="text-sm rounded-md border-gray-300 py-1.5 px-2 w-60"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Expiry (hours)</label>
            <input
              name="emailExpiryHours"
              type="number"
              min={1}
              max={720}
              placeholder="72"
              className="text-sm rounded-md border-gray-300 py-1.5 px-2 w-24"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Status</label>
            <select name="status" defaultValue={user.status} className="text-sm rounded-md border-gray-300 py-1.5 pr-8 pl-2">
              <option value="PENDING">Pending signup</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
          <button type="submit" className={cn(STYLES.btn, STYLES.btnPrimary, "ml-auto")}> 
            <Save className="w-4 h-4" /> Save account
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 px-4 py-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Role Assignments</h3>
            <p className="text-xs text-gray-500">Primary role controls login landing page. BOARD is exclusive and cannot be merged with other roles.</p>
          </div>
          <form action={async (formData) => {
            'use server'
            const nextRole = (formData.get('secondaryRole') as string | null) || ''
            const result = await addSecondaryRole(user.id, nextRole)
            if (result?.error) {
              redirect(`/admin/users/${canonicalIdentifier}?roleError=${encodeURIComponent(result.error)}`)
            }
            redirect(`/admin/users/${canonicalIdentifier}?roleMessage=${encodeURIComponent('Role added')}`)
          }} className="flex items-center gap-2">
            <select name="secondaryRole" className="text-sm rounded-md border-gray-300 py-1.5 pr-8 pl-2">
              {ROLE_ORDER.map((role) => (
                <option key={role} value={role}>{ROLE_LABELS[role]}</option>
              ))}
            </select>
            <button type="submit" className={cn(STYLES.btn, STYLES.btnSecondary)}>
              <Plus className="w-4 h-4" /> Add role
            </button>
          </form>
        </div>

        <div className="space-y-2">
          {user.roleAssignments.map((assignment) => (
            <div key={assignment.id} className="flex items-center justify-between gap-2 rounded border border-gray-200 px-3 py-2">
              <div className="text-sm text-gray-700 flex items-center gap-2">
                <span className="font-medium">{ROLE_LABELS[assignment.role as keyof typeof ROLE_LABELS] || assignment.role}</span>
                {assignment.isPrimary && <span className="text-[11px] px-1.5 py-0.5 rounded bg-primary-100 text-primary-700">Primary</span>}
              </div>
              <div className="flex items-center gap-2">
                {!assignment.isPrimary && (
                  <form action={async () => {
                    'use server'
                    const result = await setPrimaryRole(user.id, assignment.role)
                    if (result?.error) {
                      redirect(`/admin/users/${canonicalIdentifier}?roleError=${encodeURIComponent(result.error)}`)
                    }
                    redirect(`/admin/users/${canonicalIdentifier}?roleMessage=${encodeURIComponent('Primary role updated')}`)
                  }}>
                    <button type="submit" className="text-xs px-2.5 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">
                      Set primary
                    </button>
                  </form>
                )}
                {!assignment.isPrimary && (
                  <form action={async () => {
                    'use server'
                    const result = await removeSecondaryRole(user.id, assignment.role)
                    if (result?.error) {
                      redirect(`/admin/users/${canonicalIdentifier}?roleError=${encodeURIComponent(result.error)}`)
                    }
                    redirect(`/admin/users/${canonicalIdentifier}?roleMessage=${encodeURIComponent('Role removed')}`)
                  }}>
                    <button type="submit" className="text-xs px-2.5 py-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50">
                      Remove
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>

        {user.roleAssignments.some((assignment) => assignment.role === 'VOLUNTEER') && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-700 mb-2">Volunteer Review Status</p>
            <div className="flex flex-wrap items-center gap-2">
              {(['PENDING_REVIEW', 'APPROVED', 'REQUEST_CORRECTIONS'] as const).map((status) => (
                <form
                  key={status}
                  action={async () => {
                    'use server'
                    const result = await updateVolunteerReviewStatus(user.id, status)
                    if (result?.error) {
                      redirect(`/admin/users/${canonicalIdentifier}?roleError=${encodeURIComponent(result.error)}`)
                    }
                    redirect(`/admin/users/${canonicalIdentifier}?roleMessage=${encodeURIComponent(`Volunteer review status set to ${status}`)}`)
                  }}
                >
                  <button
                    type="submit"
                    className={cn(
                      'text-xs px-2.5 py-1.5 rounded border',
                      user.volunteerReviewStatus === status
                        ? 'bg-primary-50 border-primary-300 text-primary-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    {status}
                  </button>
                </form>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-700 mb-2">Role Feature Quick Links</p>
          <div className="flex flex-wrap gap-2">
            {user.roleAssignments.map((assignment) => {
              const href = assignment.role === 'ADMIN'
                ? '/admin'
                : assignment.role === 'PAYROLL'
                  ? '/payroll'
                  : assignment.role === 'HOME_ADMIN'
                    ? '/dashboard'
                    : assignment.role === 'VOLUNTEER'
                      ? '/volunteers'
                      : assignment.role === 'FACILITATOR'
                        ? '/facilitator'
                        : assignment.role === 'BOARD'
                          ? '/board'
                          : '/staff'

              return (
                <Link
                  key={`${assignment.id}-quick-link`}
                  href={href}
                  className="text-xs px-2.5 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Open {ROLE_LABELS[assignment.role as keyof typeof ROLE_LABELS] || assignment.role}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 px-4 py-4">
        <form action={async (formData) => {
          'use server'
          const result = await updateUserEmployment(user.id, formData)
          if (result?.error) {
            redirect(`/admin/users/${canonicalIdentifier}?employmentError=${encodeURIComponent(result.error)}`)
          }
          redirect(`/admin/users/${canonicalIdentifier}?employmentMessage=${encodeURIComponent('Employment details saved')}`)
        }} className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
            Employment Details
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-xs text-gray-500">Position</label>
              <input name="position" defaultValue={user.position || ''} className="mt-1 w-full text-sm rounded-md border-gray-300 py-1.5 px-2" placeholder="e.g. Facilitator" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Employment Type</label>
              <select name="employmentType" defaultValue={user.employmentType || ''} className="mt-1 w-full text-sm rounded-md border-gray-300 py-1.5 px-2">
                <option value="">Unspecified</option>
                <option value="FULL_TIME">Full time</option>
                <option value="PART_TIME">Part time</option>
                <option value="CASUAL">Casual</option>
                <option value="VOLUNTEER">Volunteer</option>
                <option value="CONTRACTOR">Contractor</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Employment Status</label>
              <select name="employmentStatus" defaultValue={user.employmentStatus || ''} className="mt-1 w-full text-sm rounded-md border-gray-300 py-1.5 px-2">
                <option value="">Unspecified</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_LEAVE">On leave</option>
                <option value="CONTRACT">Contract</option>
                <option value="SEASONAL">Seasonal</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Region</label>
              <input name="region" defaultValue={user.region || ''} className="mt-1 w-full text-sm rounded-md border-gray-300 py-1.5 px-2" placeholder="e.g. Eastern" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Start Date</label>
              <input
                type="date"
                name="startDate"
                defaultValue={user.startDate ? new Date(user.startDate).toISOString().split('T')[0] : ''}
                className="mt-1 w-full text-sm rounded-md border-gray-300 py-1.5 px-2"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className={cn(STYLES.btn, STYLES.btnSecondary)}>
              <Save className="w-4 h-4" /> Save employment
            </button>
          </div>
        </form>
      </div>

      {pendingEmailChange && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-amber-900">Pending email change request</h3>
            <p className="text-sm text-amber-800 mt-0.5">
              Requested: <span className="font-medium">{pendingEmailChange.requestedEmail}</span>
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Expires: {new Date(pendingEmailChange.expiresAt).toLocaleString()}
            </p>
          </div>
          <form action={async () => {
            'use server'
            await cancelPendingEmailChange(user.id)
            redirect(`/admin/users/${canonicalIdentifier}`)
          }}>
            <button type="submit" className={cn(STYLES.btn, STYLES.btnSecondary)}>
              Cancel request
            </button>
          </form>
        </div>
      )}

      {/* Main Content */}
      {isHomeAdmin ? (
        <AdminUserTabs
          tabs={[
            // Team Contacts tab (first / top)
            ...(user.geriatricHome ? [{
              id: 'contacts',
              label: 'Team Contacts',
              icon: 'users' as const,
              content: (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden p-5">
                  <PersonnelManager
                    home={{
                      id: user.geriatricHome.id,
                      name: user.geriatricHome.name,
                      contactName: user.geriatricHome.contactName,
                      contactPosition: user.geriatricHome.contactPosition,
                      contactEmail: user.geriatricHome.contactEmail,
                      contactPhone: user.geriatricHome.contactPhone,
                      useCustomNotificationEmail: (user.geriatricHome as any).useCustomNotificationEmail,
                      notificationEmail: (user.geriatricHome as any).notificationEmail,
                      additionalContacts
                    }}
                  />
                </div>
              )
            }] : []),
            // Facility Profile tab
            {
              id: 'facility',
              label: 'Facility Profile',
              icon: 'building' as const,
              content: (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {user.geriatricHome ? (
                    <HomeProfileForm home={user.geriatricHome} />
                  ) : (
                    <div className="p-6">
                      <div className="text-center mb-6">
                        <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <h3 className="font-medium text-gray-900 text-sm">No Facility Linked</h3>
                        <p className="text-xs text-gray-500 mt-1">Create a facility profile below, or the Home Admin can set it up from their own dashboard.</p>
                      </div>
                      <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                          <Plus className="w-4 h-4 text-primary-500" />
                          Create Facility Profile
                        </h4>
                        <CreateFacilityForm
                          userId={user.id}
                          userName={user.name}
                          userEmail={user.email}
                          action={async (formData) => {
                            'use server'
                            await createFacilityProfile(formData)
                            redirect(`/admin/users/${canonicalIdentifier}`)
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            },
            // My Account tab (matches dashboard profile layout)
            {
              id: 'account',
              label: 'My Account',
              icon: 'user' as const,
              content: (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <ProfileForm
                    user={user}
                    documents={user.documents}
                    isAdmin={true}
                    visibleTabs={['contact', 'emergency', 'documents']}
                    flat
                    showSaveButton={true}
                  />
                </div>
              )
            }
          ]}
        />
      ) : (
        <ProfileForm
          user={user}
          documents={user.documents}
          isAdmin={true}
          showSaveButton={true}
        />
      )}

      {/* Danger Zone */}
      <div className="bg-red-50 rounded-lg border border-red-200 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-900 mb-1">Danger Zone</h3>
            <p className="text-xs text-red-700 mb-3">
              {isHomeAdmin
                ? 'This will permanently remove the facility profile, events, contacts, and all data.'
                : 'This will permanently remove all user data including messages and activity history.'
              }
            </p>
            <DeleteUserButton userId={user.id} userName={user.name || user.email} />
          </div>
        </div>
      </div>
    </div>
  )
}
