import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getNotificationPreferences } from "@/app/actions/user"
import { SettingsPage } from "@/components/settings/SettingsPage"

export default async function AdminSettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const preferences = await getNotificationPreferences()
  const safePreferences = preferences || { email: true, sms: false, inApp: true }

  return (
    <SettingsPage
      userRole={session.user.role || 'ADMIN'}
      userName={session.user.name || ''}
      userEmail={session.user.email || ''}
      notificationPreferences={safePreferences}
    />
  )
}
