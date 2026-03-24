import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'

export default async function Home() {
  let session
  try {
    session = await auth()
  } catch (err) {
    logger.serverAction("Home auth error:", err)
    redirect("/login")
  }

  if (session) {
    const role = session.user?.role

    if (role === 'ADMIN') redirect("/admin")
    if (role === 'PAYROLL') redirect("/payroll")
    if (role === 'HOME_ADMIN') redirect("/dashboard")
    if (role === 'FACILITATOR' || role === 'VOLUNTEER' || role === 'BOARD' || role === 'PARTNER') redirect("/staff")
  }

  redirect("/login")
}
