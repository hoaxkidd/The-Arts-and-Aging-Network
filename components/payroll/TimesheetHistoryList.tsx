'use client'

import { useState } from 'react'
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"
import { Clock, CheckCircle, XCircle, AlertCircle, Calendar } from "lucide-react"

type Timesheet = {
  id: string
  weekStart: Date
  status: string
  totalHours: number
  submittedAt: Date | null
  entries: any[]
}

export function TimesheetHistoryList({ timesheets }: { timesheets: Timesheet[] }) {
  if (timesheets.length === 0) {
    return (
      <div className={cn(STYLES.card, "text-center py-12")}>
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No timesheet history found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {timesheets.map((ts) => {
        const weekEnd = new Date(ts.weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)
        
        return (
          <div key={ts.id} className={cn(STYLES.card, "p-4 flex items-center justify-between")}>
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                ts.status === 'APPROVED' ? "bg-green-100 text-green-600" :
                ts.status === 'REJECTED' ? "bg-red-100 text-red-600" :
                ts.status === 'SUBMITTED' ? "bg-yellow-100 text-yellow-600" :
                "bg-gray-100 text-gray-500"
              )}>
                {ts.status === 'APPROVED' ? <CheckCircle className="w-5 h-5" /> :
                 ts.status === 'REJECTED' ? <XCircle className="w-5 h-5" /> :
                 ts.status === 'SUBMITTED' ? <Clock className="w-5 h-5" /> :
                 <Calendar className="w-5 h-5" />}
              </div>
              
              <div>
                <p className="font-medium text-gray-900">
                  Week of {new Date(ts.weekStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(ts.weekStart).toLocaleDateString()} - {weekEnd.toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{ts.totalHours.toFixed(1)}h</p>
                <p className="text-xs text-gray-500">{ts.entries.length} entries</p>
              </div>
              
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-medium",
                ts.status === 'APPROVED' ? "bg-green-100 text-green-700" :
                ts.status === 'REJECTED' ? "bg-red-100 text-red-700" :
                ts.status === 'SUBMITTED' ? "bg-yellow-100 text-yellow-700" :
                "bg-gray-100 text-gray-700"
              )}>
                {ts.status === 'SUBMITTED' ? 'Pending' : 
                 ts.status.charAt(0) + ts.status.slice(1).toLowerCase()}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
