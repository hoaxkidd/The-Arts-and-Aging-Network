import { prisma } from "@/lib/prisma"
import { cancelPendingEmailChange, updateUser } from "@/app/actions/user"
import { createFacilityProfile } from "@/app/actions/home-management"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, AlertTriangle, Building2, Plus, User } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"
import { ROLE_LABELS } from "@/lib/roles"
import DeleteUserButton from "@/components/admin/DeleteUserButton"
import { CreateFacilityForm } from "@/components/admin/CreateFacilityForm"
import { ProfileForm } from "@/components/staff/ProfileForm"
import { HomeProfileForm } from "@/components/dashboard/HomeProfileForm"
import { PersonnelManager } from "@/components/dashboard/PersonnelManager"
import { AdminUserTabs } from "@/components/admin/AdminUserTabs"
import { AdminUserRolesPanel } from "@/components/admin/AdminUserRolesPanel"
import { AdminUserIntakeFormsPanel } from "@/components/admin/AdminUserIntakeFormsPanel"
import { AdminUserEmploymentForm } from "@/components/admin/AdminUserEmploymentForm"

export default async function EditUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    accountError?: string
    accountMessage?: string
    employmentError?: string
    employmentMessage?: string
    roleError?: string
    roleMessage?: string
    formsError?: string
    formsMessage?: string
  }>
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

  const isHomeAdmin = user.roleAssignments.some((assignment) => assignment.role === 'HOME_ADMIN')
  const primaryRole = user.roleAssignments.find((assignment) => assignment.isPrimary)?.role || user.role

  const [recentSubmissions, payrollSubmissions] = await Promise.all([
    prisma.formSubmission.findMany({
      where: { submittedBy: user.id },
      include: {
        template: { select: { id: true, title: true, category: true } },
        event: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.payrollFormSubmission.findMany({
      where: { userId: user.id },
      include: {
        form: { select: { id: true, title: true, formType: true, fileUrl: true } },
      },
      orderBy: { submittedAt: 'desc' },
      take: 20,
    }),
  ])

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

  const statusBadgeClass =
    user.status === 'ACTIVE'
      ? STYLES.badgeSuccess
      : user.status === 'PENDING'
        ? STYLES.badgeWarning
        : user.status === 'SUSPENDED'
          ? STYLES.badgeDanger
          : STYLES.badgeNeutral

  return (
    <div className={cn(STYLES.pageTemplateRoot, "max-w-[1200px] mx-auto")}>
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </Link>

      {/* Header (compact, non-overflow) */}
      <div className={cn(STYLES.card, "p-4 sm:p-5")}>
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className={cn(STYLES.pageIcon, "shrink-0")}>
                  <User className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                    {user.name || user.preferredName || user.email || 'User'}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">{user.email || 'No email'}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <span className={cn(STYLES.badge, statusBadgeClass)}>{user.status}</span>
              <span className={cn(STYLES.badge, STYLES.badgeInfo, "max-w-full truncate")}>
                Primary: {ROLE_LABELS[primaryRole as keyof typeof ROLE_LABELS] || primaryRole}
              </span>
              <span className={cn(STYLES.badge, STYLES.badgeNeutral, "font-mono max-w-[min(100%,12rem)] truncate")} title={user.userCode || user.id}>
                {user.userCode || user.id}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
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
        {query.formsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
            {query.formsError}
          </div>
        )}
        {query.formsMessage && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800">
            {query.formsMessage}
          </div>
        )}
      </div>

      <AdminUserTabs
        tabs={[
          {
            id: 'account',
            label: 'Account',
            icon: 'user' as const,
            content: (
              <div className="space-y-4">
                <div>
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
                  }} className="flex flex-col lg:flex-row lg:items-end gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_170px_170px] gap-3 flex-1 min-w-0">
                      <div className="min-w-0">
                        <label className="text-xs font-medium text-gray-600">Request Email</label>
                        <input
                          name="email"
                          type="email"
                          placeholder={user.email || 'new@example.com'}
                          className={cn(STYLES.input, "mt-1")}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Expiry (hours)</label>
                        <input
                          name="emailExpiryHours"
                          type="number"
                          min={1}
                          max={720}
                          placeholder="72"
                          className={cn(STYLES.input, "mt-1")}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Status</label>
                        <select name="status" defaultValue={user.status} className={cn(STYLES.input, STYLES.select, "mt-1")}>
                          <option value="PENDING">Pending signup</option>
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                          <option value="SUSPENDED">Suspended</option>
                        </select>
                      </div>
                    </div>

                    <div className="lg:ml-auto">
                      <button type="submit" className={cn(STYLES.btn, STYLES.btnPrimary, "w-full lg:w-auto")}>
                        <Save className="w-4 h-4" /> Save account
                      </button>
                    </div>
                  </form>
                </div>

                <AdminUserRolesPanel
                  userId={user.id}
                  canonicalIdentifier={canonicalIdentifier}
                  userRole={user.role}
                  roleAssignments={user.roleAssignments}
                  volunteerReviewStatus={user.volunteerReviewStatus}
                />
              </div>
            )
          },
          {
            id: 'profile',
            label: 'Profile',
            icon: 'idCard' as const,
            content: (
              <div className="space-y-6 min-w-0">
                <div className="min-w-0">
                  {isHomeAdmin ? (
                    <ProfileForm
                      user={user}
                      documents={user.documents}
                      isAdmin={true}
                      visibleTabs={['contact', 'emergency', 'documents']}
                      flat
                      showSaveButton={true}
                    />
                  ) : (
                    <ProfileForm
                      user={user}
                      documents={user.documents}
                      isAdmin={true}
                      showSaveButton={true}
                    />
                  )}
                </div>
                <AdminUserEmploymentForm
                  userId={user.id}
                  canonicalIdentifier={canonicalIdentifier}
                  user={{
                    position: user.position,
                    employmentType: user.employmentType,
                    employmentStatus: user.employmentStatus,
                    region: user.region,
                    startDate: user.startDate,
                  }}
                />
              </div>
            )
          },
          {
            id: 'forms',
            label: 'Intake & Forms',
            icon: 'fileText' as const,
            content: (
              <AdminUserIntakeFormsPanel
                userId={user.id}
                canonicalIdentifier={canonicalIdentifier}
                isHomeAdmin={isHomeAdmin}
                recentSubmissions={recentSubmissions}
                payrollSubmissions={payrollSubmissions}
              />
            )
          },
          ...(isHomeAdmin ? [{
            id: 'home',
            label: 'Home Admin',
            icon: 'building' as const,
            content: (
              <div className="space-y-4 min-w-0">
                {user.geriatricHome && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden p-4 sm:p-5 min-w-0">
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
                )}
                <div className="min-w-0">
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
              </div>
            )
          }] : []),
          {
            id: 'security',
            label: 'Security',
            icon: 'shield' as const,
            content: (
              <div className="space-y-4 min-w-0">
                {pendingEmailChange && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-amber-900">Pending email change request</h3>
                      <p className="text-sm text-amber-800 mt-0.5 break-words">
                        Requested: <span className="font-medium">{pendingEmailChange.requestedEmail}</span>
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        Expires: {new Date(pendingEmailChange.expiresAt).toLocaleString()}
                      </p>
                    </div>
                    <form
                      action={async () => {
                        'use server'
                        await cancelPendingEmailChange(user.id)
                        redirect(`/admin/users/${canonicalIdentifier}`)
                      }}
                      className="shrink-0"
                    >
                      <button type="submit" className={cn(STYLES.btn, STYLES.btnSecondary, "w-full sm:w-auto")}>
                        Cancel request
                      </button>
                    </form>
                  </div>
                )}

                <div className="bg-red-50 rounded-lg border border-red-200 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-red-900 mb-1">Danger Zone</h3>
                      <p className="text-xs text-red-700 mb-3">
                        {isHomeAdmin
                          ? 'This will permanently remove the facility profile, bookings, contacts, and all data.'
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
        ]}
      />
    </div>
  )
}
