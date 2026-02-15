import { prisma } from "@/lib/prisma"
import { createInvitation, cancelInvitation } from "@/app/actions/invitation"
import { Mail, Send, Calendar, User, Clock, Trash2 } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"

export default async function InvitationsPage() {
  const invitations = await prisma.invitation.findMany({
    orderBy: { createdAt: 'desc' },
    include: { createdBy: true }
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Invitations</h1>
        <p className="text-gray-500 text-sm">Send and track invitations to new members</p>
      </div>
      
      {/* Create Invitation Form */}
      <div className={cn(STYLES.card, "bg-white p-6 rounded-lg shadow-sm border border-gray-100")}>
        <div className="flex items-center gap-2 mb-6 text-primary-700">
          <Mail className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Send New Invitation</h2>
        </div>
        
        <form action={async (formData) => {
          'use server'
          const result = await createInvitation(formData)
          if (result.error) {
            console.error(result.error)
          } else if (result.token) {
             console.log("Invitation Link:", `${process.env.NEXTAUTH_URL}/invite/${result.token}`)
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
              <option value="CONTRACTOR">Contractor</option>
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
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Recipient</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expires</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sent By</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invitations.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{inv.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{inv.role}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 inline-flex text-xs font-medium rounded-full border ${
                      inv.status === 'ACCEPTED' 
                        ? 'bg-green-100 text-green-800 border-green-200' 
                        : inv.status === 'EXPIRED'
                        ? 'bg-red-100 text-red-800 border-red-200'
                        : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      {inv.expiresAt.toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
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
