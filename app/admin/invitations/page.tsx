import { prisma } from "@/lib/prisma"
import { createInvitation, cancelInvitation } from "@/app/actions/invitation"
import { Mail, Send, Calendar, User, Clock, Trash2, Link2, Copy, Check } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"
import { formatDateShort } from "@/lib/date-utils"
import { logger } from "@/lib/logger"
import { CopyInviteButton } from "@/components/admin/CopyInviteButton"

export const dynamic = 'force-dynamic'

function inviteUrl(token: string) {
  const base = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '')
  return base ? `${base}/invite/${token}` : `/invite/${token}`
}

export default async function InvitationsPage() {
  const invitations = await prisma.invitation.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { createdBy: true }
  })

  return (
    <div className="space-y-8">
      {/* Create Invitation Form */}
      <div className={cn(STYLES.card, "p-6")}>
        <div className="flex items-center gap-2 mb-6 text-primary-700">
          <Mail className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Send New Invitation</h2>
        </div>
        
        <form action={async (formData) => {
          'use server'
          const result = await createInvitation(formData)
          if (result.error) {
            logger.error(result.error)
          } else if (result.token) {
             logger.log("Invitation Link:", `${process.env.NEXTAUTH_URL}/invite/${result.token}`)
          }
        }} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
            <input 
              name="email" 
              type="email" 
              required 
              placeholder="colleague@artsandaging.com"
              className={STYLES.input} 
            />
          </div>
          <div className="w-full md:w-64">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
            <select name="role" className={cn(STYLES.input, STYLES.select)}>
              <option value="ADMIN">Admin</option>
              <option value="BOARD">Board Member</option>
              <option value="PAYROLL">Payroll Staff</option>
              <option value="VOLUNTEER">Volunteer</option>
              <option value="HOME_ADMIN">Geriatric Home</option>
              <option value="FACILITATOR">Facilitator</option>
              <option value="PARTNER">Community Partner</option>
            </select>
          </div>
          <button type="submit" className={cn(STYLES.btn, STYLES.btnPrimary, "w-full md:w-auto")}>
            <Send className="w-4 h-4" /> Send Invite
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-3 bg-gray-50 p-2 rounded inline-block">
          * Invitation links expire in 7 days
        </p>
      </div>

      {/* Invitations List */}
      <div className={cn(STYLES.card, "p-0 overflow-hidden")}>
        <div className="table-scroll-wrapper max-h-[calc(100vh-320px)]">
          <table className={STYLES.table}>
            <thead className="bg-gray-50">
              <tr>
                <th className={STYLES.tableHeader}>Recipient</th>
                <th className={STYLES.tableHeader}>Role</th>
                <th className={STYLES.tableHeader}>Status</th>
                <th className={STYLES.tableHeader}>Invite link</th>
                <th className={STYLES.tableHeader}>Expires</th>
                <th className={STYLES.tableHeader}>Sent By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invitations.map((inv) => (
                <tr key={inv.id} className={STYLES.tableRow}>
                  <td className={STYLES.tableCell}>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{inv.email}</span>
                    </div>
                  </td>
                  <td className={STYLES.tableCell}>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{inv.role}</span>
                    </div>
                  </td>
                  <td className={STYLES.tableCell}>
                    <span className={cn("inline-flex text-xs font-medium",
                      inv.status === 'ACCEPTED' 
                        ? 'text-green-700'
                        : inv.status === 'EXPIRED'
                        ? 'text-red-700'
                        : 'text-yellow-700'
                    )}>
                      {inv.status}
                    </span>
                  </td>
                  <td className={STYLES.tableCell}>
                    {inv.status === 'PENDING' ? (
                      <CopyInviteButton url={inviteUrl(inv.token)} />
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className={STYLES.tableCell}>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      {formatDateShort(new Date(inv.expiresAt))}
                    </div>
                  </td>
                  <td className={STYLES.tableCell}>
                    <div className="flex items-center justify-between">
                      <span>{inv.createdBy?.name || 'Unknown'}</span>
                      {inv.status === 'PENDING' && (
                        <form action={async () => {
                          'use server'
                          await cancelInvitation(inv.id)
                        }}>
                          <button className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50" title="Cancel Invitation">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {invitations.length === 0 && (
                <tr>
                  <td colSpan={6} className={cn(STYLES.tableCell, "text-center py-12")}>
                    No invitations sent yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
