'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, FileText, DollarSign, Calendar } from "lucide-react"
import { updateRequestStatus } from "@/app/actions/admin"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"

type ExpenseRequest = {
  id: string
  category: string
  amount: number | null
  description: string
  receiptUrl: string | null
  status: string
  createdAt: Date
  user: {
    id: string
    name: string | null
    email: string | null
  }
}

export function ExpenseRequestList({ requests }: { requests: ExpenseRequest[] }) {
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')

    const filtered = requests.filter(r => filter === 'ALL' || r.status === filter)
    const pendingCount = requests.filter(r => r.status === 'PENDING').length

    return (
        <div className="space-y-6">
            {/* Quick Filters */}
            <div className="flex gap-2">
                 <button 
                    onClick={() => setFilter('ALL')}
                    className={cn("px-3 py-1.5 text-sm font-medium rounded-lg transition-colors", filter === 'ALL' ? "bg-gray-800 text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50")}
                >
                    All Requests
                </button>
                <button 
                    onClick={() => setFilter('PENDING')}
                    className={cn("px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2", filter === 'PENDING' ? "bg-yellow-500 text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50")}
                >
                    Pending
                    {pendingCount > 0 && <span className="bg-white/20 px-1.5 rounded text-xs">{pendingCount}</span>}
                </button>
                <button 
                    onClick={() => setFilter('APPROVED')}
                    className={cn("px-3 py-1.5 text-sm font-medium rounded-lg transition-colors", filter === 'APPROVED' ? "bg-green-600 text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50")}
                >
                    Approved
                </button>
                 <button 
                    onClick={() => setFilter('REJECTED')}
                    className={cn("px-3 py-1.5 text-sm font-medium rounded-lg transition-colors", filter === 'REJECTED' ? "bg-red-600 text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50")}
                >
                    Rejected
                </button>
            </div>

            <div className={cn(STYLES.card, "p-0 overflow-hidden")}>
                <div className="table-scroll-wrapper max-h-[calc(100vh-360px)]">
                <table className={STYLES.table}>
                    <thead className="bg-gray-50">
                    <tr>
                        <th className={STYLES.tableHeader}>Staff Member</th>
                        <th className={STYLES.tableHeader}>Type</th>
                        <th className={STYLES.tableHeader}>Details</th>
                        <th className={STYLES.tableHeader}>Amount</th>
                        <th className={STYLES.tableHeader}>Date</th>
                        <th className={STYLES.tableHeader}>Status</th>
                        <th className={cn(STYLES.tableHeader, "text-right")}>Actions</th>
                    </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {filtered.map((req) => (
                        <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-xs">
                                {req.user.name?.[0] || 'U'}
                            </div>
                            <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">{req.user.name}</div>
                                <div className="text-xs text-gray-500">{req.user.email || 'No email'}</div>
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
                                    await updateRequestStatus(req.id, 'APPROVED')
                                }}>
                                <button className="text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded" title="Approve">
                                    <CheckCircle className="w-5 h-5" />
                                </button>
                                </form>
                                <form action={async () => {
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
                    {filtered.length === 0 && (
                        <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                            No requests found matching this filter.
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
