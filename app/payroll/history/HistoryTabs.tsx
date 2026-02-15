'use client'

import { useState } from 'react'
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"
import { Clock, Calendar, DollarSign, FileText, ClipboardList, List } from "lucide-react"
import { TimesheetHistoryList } from "@/components/payroll/TimesheetHistoryList"

type HistoryEntry = {
  id: string
  type: string
  date: Date | string
  category?: string
  description?: string
  amount?: number
  hours?: number
  status: string
}

type Props = {
  historyEntries: HistoryEntry[]
  timesheets: any[]
}

export function HistoryTabs({ historyEntries, timesheets }: Props) {
  const [activeTab, setActiveTab] = useState<'ENTRIES' | 'TIMESHEETS'>('ENTRIES')

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-1">
        <button
          onClick={() => setActiveTab('ENTRIES')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 flex items-center gap-2",
            activeTab === 'ENTRIES' 
              ? "border-primary-500 text-primary-700 bg-primary-50/50" 
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          )}
        >
          <List className="w-4 h-4" />
          Recent Activity
        </button>
        <button
          onClick={() => setActiveTab('TIMESHEETS')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 flex items-center gap-2",
            activeTab === 'TIMESHEETS' 
              ? "border-primary-500 text-primary-700 bg-primary-50/50" 
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          )}
        >
          <ClipboardList className="w-4 h-4" />
          Weekly Timesheets
        </button>
      </div>

      {/* Content */}
      {activeTab === 'ENTRIES' && (
        <div className={cn(STYLES.card, "p-0 overflow-hidden")}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {historyEntries.map((item) => (
                  <tr key={`${item.type}-${item.id}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        {item.type === 'TIME_ENTRY' ? (
                          <>
                            <Clock className="w-4 h-4 text-primary-600" />
                            <span>Check-in</span>
                          </>
                        ) : (
                          <>
                            {item.category === 'EXPENSE' ? <DollarSign className="w-4 h-4 text-green-600" /> :
                             item.category === 'SICK_DAY' ? <Calendar className="w-4 h-4 text-red-600" /> :
                             <FileText className="w-4 h-4 text-blue-600" />}
                            <span className="capitalize">{item.category?.replace('_', ' ').toLowerCase() || 'Request'}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.type === 'TIME_ENTRY' ? (
                        `${item.hours} hours logged`
                      ) : (
                        <>
                          <span className="block truncate max-w-xs">{item.description}</span>
                          {item.amount && <span className="text-gray-500">${item.amount.toFixed(2)}</span>}
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(STYLES.badge, 
                        item.status === 'APPROVED' ? 'bg-green-100 text-green-800 border-green-200' :
                        item.status === 'REJECTED' ? 'bg-red-100 text-red-800 border-red-200' :
                        'bg-yellow-100 text-yellow-800 border-yellow-200'
                      )}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {historyEntries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      No history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'TIMESHEETS' && (
        <TimesheetHistoryList timesheets={timesheets} />
      )}
    </div>
  )
}
