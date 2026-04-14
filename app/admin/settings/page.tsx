import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getNotificationPreferences } from "@/app/actions/user"
import { BookingsAccessPolicyPanel } from "@/components/admin/BookingsAccessPolicyPanel"
import { ReminderPolicyPanel } from "@/components/admin/ReminderPolicyPanel"
import { AdminPersonalPreferencesPanel } from "@/components/admin/AdminPersonalPreferencesPanel"
import { AdminToolsIndexPanel } from "@/components/admin/AdminToolsIndexPanel"
import { parseBookingsAccessPolicyConfig, BOOKINGS_ACCESS_POLICY_TEMPLATE_TYPE } from "@/lib/bookings-access-policy"
import { parseReminderPolicyConfig, REMINDER_POLICY_TEMPLATE_TYPE } from "@/lib/reminder-policy"
import { Settings2, ShieldCheck } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') redirect('/admin')

  const [preferences, user, policyTemplate, reminderTemplate, latestPolicyAudit] = await Promise.all([
    getNotificationPreferences(),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        preferredName: true,
        phone: true,
        image: true,
        bio: true,
        role: true,
        status: true,
        lastLoginAt: true,
      },
    }),
    prisma.emailTemplate.findUnique({
      where: { type: BOOKINGS_ACCESS_POLICY_TEMPLATE_TYPE },
      select: { content: true },
    }),
    prisma.emailTemplate.findUnique({
      where: { type: REMINDER_POLICY_TEMPLATE_TYPE },
      select: { content: true },
    }),
    prisma.auditLog.findFirst({
      where: { action: 'BOOKINGS_ACCESS_POLICY_UPDATED' },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    }),
  ])

  if (!user?.email) redirect('/admin')

  const safePreferences = preferences || { email: true, sms: false, inApp: true, emailFrequency: 'immediate' as const }
  const bookingsAccessPolicy = parseBookingsAccessPolicyConfig(policyTemplate?.content)
  const reminderPolicy = parseReminderPolicyConfig(reminderTemplate?.content)

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto pt-4 pb-6 space-y-4">
        <section className="rounded-xl border border-gray-200 bg-gradient-to-r from-white to-gray-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary-50 p-2 text-primary-700">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Admin Settings</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Governance controls, personal admin preferences, and complete route access tooling in one structured workspace.
                </p>
              </div>
            </div>
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
              <p className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                Program Coordinator accounts are always blocked from organization booking feeds
              </p>
            </div>
          </div>
        </section>

        <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
          <nav className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4" aria-label="Settings sections">
            <a href="#access-control" className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 font-medium text-gray-800 hover:bg-white">Access Control</a>
            <a href="#reminder-policy" className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 font-medium text-gray-800 hover:bg-white">Reminder Policy</a>
            <a href="#admin-account" className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 font-medium text-gray-800 hover:bg-white">Admin Account</a>
            <a href="#tools-index" className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 font-medium text-gray-800 hover:bg-white">Tools Index</a>
          </nav>
        </div>

        <div id="access-control" className="scroll-mt-24">
          <BookingsAccessPolicyPanel
            allowedRoles={bookingsAccessPolicy.allowedRoles}
            lastUpdatedAt={latestPolicyAudit?.createdAt?.toISOString() ?? null}
            lastUpdatedBy={latestPolicyAudit?.user?.name || latestPolicyAudit?.user?.email || null}
          />
        </div>

        <section id="reminder-policy" className="scroll-mt-24 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Reminder Delivery Policy</h2>
            <p className="mt-1 text-xs text-gray-600">
              Configure automatic reminder timing for Program Coordinators and facilitators, plus reminder worker endpoint settings.
            </p>
          </div>
          <ReminderPolicyPanel
            config={reminderPolicy}
            canEditCron={process.env.NODE_ENV !== 'production'}
          />
        </section>

        <div id="admin-account" className="scroll-mt-24">
          <AdminPersonalPreferencesPanel
            user={{
              id: user.id,
              email: user.email,
              name: user.name,
              preferredName: user.preferredName,
              phone: user.phone,
              image: user.image,
              bio: user.bio,
              role: user.role,
              status: user.status,
              lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
            }}
            notificationPreferences={safePreferences}
          />
        </div>

        <div id="tools-index" className="scroll-mt-24">
          <AdminToolsIndexPanel />
        </div>
      </div>
    </div>
  )
}
