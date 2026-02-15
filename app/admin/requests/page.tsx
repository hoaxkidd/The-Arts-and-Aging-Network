import { prisma } from "@/lib/prisma"
import { updateRequestStatus } from "@/app/actions/admin"
import { CheckCircle, XCircle, Clock, FileText, DollarSign, Calendar } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"

export default async function AdminRequestsPage() {
  const requests = await prisma.expenseRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Staff Requests</h1>
        <p className="text-gray-500 text-sm">Manage expense reimbursements, sick days, and time off requests.</p>
      </div>

      <div className={cn(STYLES.card, "p-0 overflow-hidden")}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Staff Member</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-xs">
                        {req.user.name?.[0] || 'U'}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{req.user.name}</div>
                        <div className="text-xs text-gray-500">{req.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      {req.category === 'EXPENSE' ? <DollarSign className="w-4 h-4 text-green-600" /> :
                       req.category === 'SICK_DAY' ? <Calendar className="w-4 h-4 text-red-600" /> :
                       <FileText className="w-4 h-4 text-blue-600" />}
                      <span className="capitalize">{req.category.replace('_', ' ').toLowerCase()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600 truncate max-w-xs" title={req.description}>
                      {req.description}
                    </p>
                    {req.receiptUrl && (
                      <a href={req.receiptUrl} target="_blank" className="text-xs text-primary-600 hover:underline mt-1 block">
                        View Receipt
                      </a>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {req.amount ? `$${req.amount.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {req.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(STYLES.badge, 
                      req.status === 'APPROVED' ? 'bg-green-100 text-green-800 border-green-200' :
                      req.status === 'REJECTED' ? 'bg-red-100 text-red-800 border-red-200' :
                      'bg-yellow-100 text-yellow-800 border-yellow-200'
                    )}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {req.status === 'PENDING' && (
                      <div className="flex items-center justify-end gap-2">
                        <form action={async () => {
                          'use server'
                          await updateRequestStatus(req.id, 'APPROVED')
                        }}>
                          <button className="text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded" title="Approve">
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        </form>
                        <form action={async () => {
                          'use server'
                          await updateRequestStatus(req.id, 'REJECTED')
                        }}>
                          <button className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded" title="Reject">
                            <XCircle className="w-5 h-5" />
                          </button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No requests found.
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
