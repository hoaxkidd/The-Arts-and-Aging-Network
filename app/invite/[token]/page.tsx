import { prisma } from "@/lib/prisma"
import { acceptInvitation } from "@/app/actions/invitation"
import { redirect } from "next/navigation"
import { CheckCircle, XCircle } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"

export default async function InvitePage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const invitation = await prisma.invitation.findUnique({
    where: { token: params.token },
  })
  
  // Reuse the background styling logic
  const bgBlobs = (
    <>
      <div className="absolute top-0 left-0 w-64 h-64 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-secondary-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
    </>
  )

  if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
        {bgBlobs}
        <div className="bg-white/90 backdrop-blur rounded-lg shadow-xl p-8 text-center max-w-md w-full border border-red-100 relative z-10">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation Expired</h1>
          <p className="text-gray-600">This link is no longer valid. Please contact the administrator for a new invitation.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      {bgBlobs}
      
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-2xl p-8 border border-white/50">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Welcome Aboard</h2>
            <p className="mt-2 text-gray-600">Setting up account for <span className="font-semibold text-primary-700">{invitation.email}</span></p>
            <div className="mt-4 inline-block px-3 py-1 bg-secondary-100 text-secondary-800 rounded-full text-sm font-medium border border-secondary-200">
              Role: {invitation.role}
            </div>
          </div>

          <form action={async (formData) => {
            'use server'
            const result = await acceptInvitation(params.token, formData)
            if (result.success) {
              redirect('/login?registered=true')
            }
          }} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
              <input type="text" name="name" required className={cn(STYLES.input, "py-3")} placeholder="Jane Doe" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Set Password</label>
              <input type="password" name="password" required minLength={6} className={cn(STYLES.input, "py-3")} placeholder="••••••" />
            </div>
            <button type="submit" className={cn(STYLES.btn, STYLES.btnPrimary, "w-full py-3 text-lg shadow-lg")}>
              Create Account
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
