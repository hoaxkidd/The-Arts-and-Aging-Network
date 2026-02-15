'use client'

import { useState } from 'react'
import { quickCheckIn } from '@/app/actions/payroll'
import { CheckCircle, Clock, Calendar } from 'lucide-react'

type CheckInHistory = {
    id: string
    timestamp: Date
    action: string
}

export function SimpleCheckIn({ history }: { history: CheckInHistory[] }) {
  const [loading, setLoading] = useState(false)
  const [lastCheckIn, setLastCheckIn] = useState<Date | null>(null)

  const handleCheckIn = async () => {
    if (!confirm('Confirm check-in for today?')) return
    setLoading(true)
    const res = await quickCheckIn()
    setLoading(false)
    if (res.success && res.timestamp) {
        setLastCheckIn(res.timestamp)
    }
  }

  // Determine if checked in today
  const today = new Date()
  const checkedInToday = history.some(h => 
    new Date(h.timestamp).toDateString() === today.toDateString()
  ) || (lastCheckIn && lastCheckIn.toDateString() === today.toDateString())

  return (
    <div className="space-y-6">
      {/* Main Check-In Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
            checkedInToday ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'
        }`}>
            {checkedInToday ? (
                <CheckCircle className="w-10 h-10" />
            ) : (
                <Clock className="w-10 h-10" />
            )}
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 mb-2">
            {checkedInToday ? "You're checked in!" : "Daily Check-in"}
        </h2>
        <p className="text-gray-500 mb-8 max-w-xs mx-auto">
            {checkedInToday 
                ? "Your attendance has been recorded for today." 
                : "Click below to log your attendance for the day."}
        </p>

        <button
            onClick={handleCheckIn}
            disabled={loading || !!checkedInToday}
            className={`w-full max-w-sm mx-auto py-4 rounded-lg font-bold text-lg shadow-sm transition-all transform active:scale-95 ${
                checkedInToday 
                ? 'bg-green-600 text-white cursor-default' 
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
            }`}
        >
            {loading ? 'Logging...' : checkedInToday ? 'Check-in Complete' : 'Check In Now'}
        </button>
      </div>

      {/* History List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {history.length > 0 ? (
                history.map((entry) => (
                    <div key={entry.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">
                                    {new Date(entry.timestamp).toLocaleDateString(undefined, { 
                                        weekday: 'long', 
                                        month: 'short', 
                                        day: 'numeric' 
                                    })}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                        <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                            Success
                        </span>
                    </div>
                ))
            ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                    No recent check-ins found.
                </div>
            )}
        </div>
      </div>
    </div>
  )
}
