import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { logger } from "@/lib/logger"
import { getRoleHomePath } from "@/lib/role-routes"

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
    redirect(getRoleHomePath(role))
  }

  redirect("/login")
}
