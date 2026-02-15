import { prisma } from "@/lib/prisma"
import { updateUser } from "@/app/actions/user"
import { createFacilityProfile } from "@/app/actions/home-management"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, AlertTriangle, Building2, Plus, Settings } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"
import DeleteUserButton from "@/components/admin/DeleteUserButton"
import { ProfileForm } from "@/components/staff/ProfileForm"
import { HomeProfileForm } from "@/components/dashboard/HomeProfileForm"
import { PersonnelManager } from "@/components/dashboard/PersonnelManager"
import { AdminUserTabs } from "@/components/admin/AdminUserTabs"

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      documents: true,
      geriatricHome: true,
    }
  })

  if (!user) return <div>User not found</div>

  const isHomeAdmin = user.role === 'HOME_ADMIN'

  // Parse additional contacts for Home Admin
  const additionalContacts = isHomeAdmin && user.geriatricHome?.additionalContacts
    ? JSON.parse(user.geriatricHome.additionalContacts as string)
    : []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <Link href="/admin/users" className="text-gray-500 hover:text-gray-700 flex items-center gap-2 mb-3 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isHomeAdmin ? 'Edit Home Admin' : 'Edit User Profile'}
          </h1>
          <p className="text-gray-500 text-sm">
            {isHomeAdmin
              ? `Manage facility profile and account for ${user.geriatricHome?.name || user.name || 'this home admin'}`
              : `Manage details and permissions for ${user.name || user.email}`
            }
          </p>
        </div>
      </div>

      {/* Account Settings Bar */}
      <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
        <form action={async (formData) => {
          'use server'
          await updateUser(id, formData)
          redirect(`/admin/users/${id}`)
        }} className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Settings className="w-4 h-4" />
            <span className="font-medium text-gray-700">Account:</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Role</label>
            <select name="role" defaultValue={user.role} className="text-sm rounded-md border-gray-300 py-1.5 pr-8 pl-2">
              <option value="ADMIN">Admin</option>
              <option value="HOME_ADMIN">Home Admin</option>
              <option value="PAYROLL">Payroll Staff</option>
              <option value="BOARD">Board Member</option>
              <option value="CONTRACTOR">Contractor</option>
              <option value="VOLUNTEER">Volunteer</option>
              <option value="FACILITATOR">Facilitator</option>
              <option value="PARTNER">Community Partner</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Status</label>
            <select name="status" defaultValue={user.status} className="text-sm rounded-md border-gray-300 py-1.5 pr-8 pl-2">
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
          <button type="submit" className="ml-auto text-sm bg-primary-500 text-white px-3 py-1.5 rounded-md hover:bg-primary-600 flex items-center gap-1.5 font-medium">
            <Save className="w-3.5 h-3.5" /> Save
          </button>
        </form>
      </div>

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
                      <form action={async (formData) => {
                        'use server'
                        await createFacilityProfile(formData)
                        redirect(`/admin/users/${id}`)
                      }} className="border border-dashed border-gray-300 rounded-lg p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                          <Plus className="w-4 h-4 text-primary-500" />
                          Create Facility Profile
                        </h4>
                        <input type="hidden" name="userId" value={id} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Facility Name *</label>
                            <input name="name" required className={STYLES.input} placeholder="e.g., Sunrise Personal Care Home" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Max Capacity</label>
                            <input name="maxCapacity" type="number" defaultValue="10" className={STYLES.input} />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Address *</label>
                            <input name="address" required className={STYLES.input} placeholder="123 Main St, Winnipeg, MB" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Contact Name *</label>
                            <input name="contactName" required defaultValue={user.name || ''} className={STYLES.input} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Contact Email *</label>
                            <input name="contactEmail" type="email" required defaultValue={user.email} className={STYLES.input} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Contact Phone *</label>
                            <input name="contactPhone" required className={STYLES.input} placeholder="(204) 555-0123" />
                          </div>
                        </div>
                        <div className="flex justify-end pt-2">
                          <button type="submit" className={cn(STYLES.btn, STYLES.btnPrimary, "text-sm")}>
                            <Plus className="w-4 h-4" /> Create Facility
                          </button>
                        </div>
                      </form>
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
            <DeleteUserButton userId={id} userName={user.name || user.email} />
          </div>
        </div>
      </div>
    </div>
  )
}
