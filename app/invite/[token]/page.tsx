import { prisma } from "@/lib/prisma"
import { InviteForm } from "@/components/invite/InviteForm"
import { PendingEmailChange } from "@/components/invite/PendingEmailChange"
import { XCircle, Clock } from "lucide-react"
import { acceptInvitation } from "@/app/actions/invitation"
import { redirect } from "next/navigation"

export default async function InvitePage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  
  // Try inviteCode first (new format: INV001), then fall back to token (old format)
  let invitation = await prisma.invitation.findUnique({
    where: { inviteCode: params.token },
  })
  
  if (!invitation) {
    invitation = await prisma.invitation.findUnique({
      where: { token: params.token },
    })
  }
  
  // Reuse the background styling logic
  const bgBlobs = (
    <>
      <div className="absolute top-0 left-0 w-64 h-64 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-secondary-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
    </>
  )

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
        {bgBlobs}
        <div className="bg-white/90 backdrop-blur rounded-lg shadow-xl p-8 text-center max-w-md w-full border border-red-100 relative z-10">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation Not Found</h1>
          <p className="text-gray-600">This invitation link is not valid. Please contact the administrator.</p>
        </div>
      </div>
    )
  }

  // Check if invitation is expired
  if (invitation.status === 'PENDING' && invitation.expiresAt < new Date()) {
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

  // Check if email change is pending - show pending screen
  if (invitation.emailChangeStatus === 'PENDING') {
    return (
      <PendingEmailChange 
        originalEmail={invitation.email}
        requestedEmail={invitation.requestedEmail || ''}
        bgBlobs={bgBlobs}
      />
    )
  }

  async function handleSubmit(formData: FormData) {
    'use server'
    console.log('[Invite] handleSubmit called for invitation:', invitation?.token)
    
    const result = await acceptInvitation(invitation!.token, formData)
    console.log('[Invite] acceptInvitation result:', result)
    
    if (result.success) {
      console.log('[Invite] Success, redirecting to:', result.redirectUrl)
      if (result.pendingEmailChange) {
        redirect('/invite/' + params.token + '?refresh=true')
      } else if (result.redirectUrl) {
        redirect(result.redirectUrl + '&registered=true')
      } else {
        redirect('/login?registered=true')
      }
    }
    
    // Return error if server action failed
    if (result.error) {
      console.log('[Invite] Error from server action:', result.error)
      return { error: result.error }
    }
    
    return { error: 'An unexpected error occurred. Please try again.' }
  }

  // Fetch existing homes for HOME_ADMIN role
  const existingHomes = invitation.role === 'HOME_ADMIN' 
    ? await prisma.geriatricHome.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      })
    : []

  return <InviteForm 
    invitation={invitation!} 
    bgBlobs={bgBlobs} 
    onSubmit={handleSubmit}
    existingHomes={existingHomes}
  />
}
