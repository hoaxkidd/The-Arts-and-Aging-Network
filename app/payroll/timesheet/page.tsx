'use client'

import { useState, useEffect } from 'react'
import { Clock, FileText, Plus } from 'lucide-react'
import { WeeklyTimesheetForm } from '@/components/timesheet/WeeklyTimesheetForm'
import { getWeeklyTimesheet, createWeeklyTimesheet } from '@/app/actions/timesheet'

type TimesheetEntry = {
  id: string
  date: Date | string
  checkInTime: Date | string | null
  checkOutTime: Date | string | null
  hoursWorked: number
  programName: string | null
  fundingClass: string | null
  notes: string | null
}

type Timesheet = {
  id: string
  weekStart: Date | string
  status: string
  entries: TimesheetEntry[]
  rejectionNote: string | null
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatWeekRange(weekStart: Date): string {
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

export default function TimesheetPage() {
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null)
  const [currentWeek, setCurrentWeek] = useState<Date>(getWeekStart(new Date()))
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadTimesheet(currentWeek)
  }, [currentWeek])

  async function loadTimesheet(weekStart: Date) {
    setLoading(true)
    const result = await getWeeklyTimesheet(weekStart)
    if (result.timesheet) {
      setTimesheet(result.timesheet as Timesheet)
    } else {
      setTimesheet(null)
    }
    setLoading(false)
  }

  async function handleStartTimesheet() {
    setCreating(true)
    const result = await createWeeklyTimesheet(currentWeek)
    if (result.timesheet) {
      setTimesheet(result.timesheet as Timesheet)
    }
    setCreating(false)
  }

  function handleWeekChange(newWeek: Date) {
    setCurrentWeek(getWeekStart(newWeek))
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Weekly Timesheet</h1>
            <p className="text-sm text-gray-500">Track your hours and submit for approval</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : timesheet ? (
          <WeeklyTimesheetForm
            timesheet={timesheet}
            onWeekChange={handleWeekChange}
          />
        ) : (
          /* Empty state - no timesheet for this week */
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Week navigation header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  const newStart = new Date(currentWeek)
                  newStart.setDate(newStart.getDate() - 7)
                  handleWeekChange(newStart)
                }}
                className="p-2 hover:bg-gray-200 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="text-center">
                <h2 className="font-semibold text-gray-900">
                  Week of {formatWeekRange(currentWeek)}
                </h2>
              </div>
              <button
                onClick={() => {
                  const newStart = new Date(currentWeek)
                  newStart.setDate(newStart.getDate() + 7)
                  handleWeekChange(newStart)
                }}
                className="p-2 hover:bg-gray-200 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            {/* Empty state body */}
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No timesheet for this week</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
                Start a new timesheet to begin logging your hours for this week.
              </p>
              <button
                onClick={handleStartTimesheet}
                disabled={creating}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium transition-colors"
              >
                {creating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Start Timesheet
              </button>
            </div>
          </div>
        )}

        {/* Quick Info */}
        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">How Timesheets Work</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Add entries for each day you worked</li>
            <li>• Enter check-in/out times OR manual hours</li>
            <li>• Specify the funding class for each entry</li>
            <li>• Submit your timesheet at the end of the week</li>
            <li>• Administrators will review and approve</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
