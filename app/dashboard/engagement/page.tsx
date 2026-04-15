import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getInboxBasePathForRole } from "@/lib/role-routes"

export default async function EngagementRedirectPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const basePath = getInboxBasePathForRole(session.user.role)
  redirect(`${basePath}/inbox`)
}
