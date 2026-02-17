import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getNotificationPreferences } from "@/app/actions/user"
import { SettingsPage } from "@/components/settings/SettingsPage"

export default async function PayrollSettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [preferences, user] = await Promise.all([
    getNotificationPreferences(),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, phone: true },
    }),
  ])
  const safePreferences = preferences || { email: true, sms: false, inApp: true }

  return (
    <SettingsPage
      userEmail={user?.email ?? session.user.email ?? ''}
      initialPhone={user?.phone ?? null}
      notificationPreferences={safePreferences}
    />
  )
}
