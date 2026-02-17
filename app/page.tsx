import { auth } from "@/auth"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function Home() {
  let session
  try {
    session = await auth()
  } catch (err) {
    console.error("Home auth error:", err)
    redirect("/login")
  }

  if (session) {
    const role = session.user?.role

    if (role === 'ADMIN') redirect("/admin")
    if (role === 'PAYROLL') redirect("/payroll")
    if (role === 'HOME_ADMIN') redirect("/dashboard")
  }

  redirect("/login")
}
