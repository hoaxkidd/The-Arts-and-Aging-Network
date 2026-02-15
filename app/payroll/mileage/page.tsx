'use client'

import { useState, useEffect } from 'react'
import { MapPin, Trash2, ChevronLeft, ChevronRight, Car } from 'lucide-react'
import { MileageEntryForm } from '@/components/expense/MileageEntryForm'
import { getMyMileageEntries, deleteMileageEntry } from '@/app/actions/mileage'
import { cn } from '@/lib/utils'

type MileageEntry = {
  id: string
  date: Date | string
  startLocation: string
  endLocation: string
  kilometers: number
  fundingClass: string | null
  purpose: string | null
  status: string
  rejectionNote: string | null
}

export default function MileagePage() {
  const [entries, setEntries] = useState<MileageEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    loadEntries()
  }, [])

  async function loadEntries() {
    setLoading(true)
    const result = await getMyMileageEntries()
    if (result.entries) {
      setEntries(result.entries as MileageEntry[])
    }
    setLoading(false)
  }

  async function handleDelete(entryId: string) {
    if (!confirm('Delete this mileage entry?')) return
    const result = await deleteMileageEntry(entryId)
    if (result.error) {
      alert(result.error)
    } else {
      loadEntries()
    }
  }

  function navigateMonth(direction: number) {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() + direction)
    setCurrentMonth(newMonth)
  }

  // Filter entries for current month
  const monthEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date)
    return entryDate.getMonth() === currentMonth.getMonth() &&
           entryDate.getFullYear() === currentMonth.getFullYear()
  })

  // Calculate totals
  const totalKm = monthEntries.reduce((sum, e) => sum + e.kilometers, 0)
  const approvedKm = monthEntries.filter(e => e.status === 'APPROVED').reduce((sum, e) => sum + e.kilometers, 0)
  const pendingKm = monthEntries.filter(e => e.status === 'PENDING').reduce((sum, e) => sum + e.kilometers, 0)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mileage Tracking</h1>
            <p className="text-sm text-gray-500">Log and track your travel reimbursements</p>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-auto space-y-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="text-center">
            <h2 className="font-semibold text-gray-900">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center justify-center gap-4 mt-1 text-sm">
              <span className="text-gray-500">{totalKm.toFixed(1)} km total</span>
              <span className="text-green-600">{approvedKm.toFixed(1)} km approved</span>
              {pendingKm > 0 && <span className="text-yellow-600">{pendingKm.toFixed(1)} km pending</span>}
            </div>
          </div>
          <button
            onClick={() => navigateMonth(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Add Entry Form */}
        <MileageEntryForm onSuccess={loadEntries} />

        {/* Entries List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Mileage Entries</h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : monthEntries.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {monthEntries.map(entry => (
                <div key={entry.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {entry.startLocation} → {entry.endLocation}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 text-xs font-medium rounded",
                            entry.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                            entry.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          )}>
                            {entry.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span>{new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                          <span className="font-medium text-gray-700">{entry.kilometers} km</span>
                          {entry.fundingClass && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                              {entry.fundingClass}
                            </span>
                          )}
                        </div>
                        {entry.purpose && (
                          <p className="text-sm text-gray-500 mt-1">{entry.purpose}</p>
                        )}
                        {entry.rejectionNote && (
                          <p className="text-sm text-red-600 mt-1">Rejected: {entry.rejectionNote}</p>
                        )}
                      </div>
                    </div>

                    {entry.status === 'PENDING' && (
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No mileage entries for this month</p>
              <p className="text-sm text-gray-400 mt-1">Add your first entry above</p>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Mileage Reimbursement</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Log each trip separately with start and end locations</li>
            <li>• Include the funding class for proper accounting</li>
            <li>• Entries are reviewed monthly by administrators</li>
            <li>• Approved mileage will be included in your next pay period</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
