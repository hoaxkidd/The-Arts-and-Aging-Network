import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { submitRequest } from "@/app/actions/requests"
import { FileText, PlusCircle, DollarSign, Calendar } from "lucide-react"
import { RequestFilters } from "@/components/RequestFilters"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"
import { redirect } from "next/navigation"

export default async function RequestsPage(props: { searchParams: Promise<{ category?: string, status?: string }> }) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) redirect("/login")

  const searchParams = await props.searchParams
  const where: Record<string, unknown> = { userId }
  if (searchParams.category) where.category = searchParams.category
  if (searchParams.status) where.status = searchParams.status

  let requests: Awaited<ReturnType<typeof prisma.expenseRequest.findMany>> = []
  try {
    requests = await prisma.expenseRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
  } catch (err) {
    console.error("[Payroll requests] DB error:", err instanceof Error ? err.message : err)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Requests</h1>
        <p className="text-gray-500 text-sm">Submit expenses, sick days, or time off requests</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Request Form */}
        <div className="lg:col-span-1">
          <div className={cn(STYLES.card, "sticky top-8")}>
            <div className="flex items-center gap-2 mb-6 text-secondary-700">
              <PlusCircle className="w-5 h-5" />
              <h2 className="text-lg font-semibold">New Request</h2>
            </div>

            <form action={async (formData) => {
              'use server'
              await submitRequest(formData)
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
                <select name="category" className={cn(STYLES.input, STYLES.select)}>
                  <option value="EXPENSE">Expense Reimbursement</option>
                  <option value="SICK_DAY">Sick Day</option>
                  <option value="OFF_DAY">Time Off</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea 
                  name="description" 
                  required 
                  rows={3}
                  className={cn(STYLES.input, "pt-2")}
                  placeholder="Details about the request..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (if applicable)</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input 
                    type="number" 
                    name="amount" 
                    step="0.01" 
                    className={cn(STYLES.input, "pl-9")} 
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Receipt / Document</label>
                <input 
                  type="file" 
                  name="receipt" 
                  accept=".pdf,.jpg,.png"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-secondary-50 file:text-secondary-700 hover:file:bg-secondary-100" 
                />
                <p className="text-xs text-gray-500 mt-1">Max 5MB (PDF, JPG, PNG)</p>
              </div>

              <button type="submit" className={cn(STYLES.btn, "bg-secondary-600 text-white w-full hover:bg-secondary-700")}>
                Submit Request
              </button>
            </form>
          </div>
        </div>

        {/* Requests List */}
        <div className="lg:col-span-2 space-y-4">
          <RequestFilters />
          
          {requests.map((req) => (
            <div key={req.id} className={cn(STYLES.card, "flex items-start justify-between transition-colors")}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${
                  req.category === 'EXPENSE' ? 'bg-green-100 text-green-600' :
                  req.category === 'SICK_DAY' ? 'bg-red-100 text-red-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {req.category === 'EXPENSE' ? <DollarSign className="w-5 h-5" /> :
                   req.category === 'SICK_DAY' ? <Calendar className="w-5 h-5" /> :
                   <FileText className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {req.category === 'SICK_DAY' ? 'Sick Day' :
                     req.category === 'OFF_DAY' ? 'Time Off Request' :
                     'Expense Reimbursement'}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">{req.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                    {req.amount && <span>${req.amount.toFixed(2)}</span>}
                    {req.receiptUrl && (
                      <a href={req.receiptUrl} target="_blank" className="text-secondary-600 hover:underline">
                        View Receipt
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                req.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' :
                req.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                'bg-yellow-50 text-yellow-700 border-yellow-200'
              }`}>
                {req.status}
              </span>
            </div>
          ))}
          {requests.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-100 border-dashed">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No requests submitted yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
