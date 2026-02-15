import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function Home() {
  const session = await auth()
  
  if (session) {
    const role = session.user?.role
    
    if (role === 'ADMIN') redirect("/admin")
    if (role === 'PAYROLL') redirect("/payroll")
    if (role === 'HOME_ADMIN') redirect("/dashboard")
    
    // Fallback for other roles (VOLUNTEER, etc.)
    // For now, keep them on root or redirect to a user dashboard if it exists
    // return <div>Welcome {session.user?.name}</div>
  }
  
  redirect("/login")
}
