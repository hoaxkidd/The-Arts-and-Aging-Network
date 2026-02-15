'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Send, Loader2, Trash2 } from 'lucide-react'
import { saveTimesheetEntry, deleteTimesheetEntry, submitTimesheet } from '@/app/actions/timesheet'

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

type Props = {
  timesheet: Timesheet
  onWeekChange: (date: Date) => void
}

const FUNDING_CLASSES = ['GRANT_A', 'GRANT_B', 'OPERATIONAL', 'VOLUNTEER', 'OTHER']

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

function formatTime(date: Date | string | null): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function getTimeValue(date: Date | string | null): string {
  if (!date) return ''
  const d = new Date(date)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function getWeekDays(weekStart: Date | string): Date[] {
  const start = new Date(weekStart)
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(start)
    day.setDate(start.getDate() + i)
    days.push(day)
  }
  return days
}

export function WeeklyTimesheetForm({ timesheet, onWeekChange }: Props) {
  const [isPending, setIsPending] = useState(false)
  const [editingEntry, setEditingEntry] = useState<string | null>(null)
  const [newEntryDay, setNewEntryDay] = useState<Date | null>(null)

  const weekStart = new Date(timesheet.weekStart)
  const weekDays = getWeekDays(weekStart)
  const isEditable = timesheet.status === 'DRAFT'

  const totalHours = timesheet.entries.reduce((sum, e) => sum + e.hoursWorked, 0)

  function navigateWeek(direction: number) {
    const newStart = new Date(weekStart)
    newStart.setDate(newStart.getDate() + (7 * direction))
    onWeekChange(newStart)
  }

  async function handleSaveEntry(formData: FormData) {
    setIsPending(true)
    const data = {
      id: formData.get('entryId') as string || undefined,
      date: formData.get('date') as string,
      checkInTime: formData.get('checkInTime') as string || undefined,
      checkOutTime: formData.get('checkOutTime') as string || undefined,
      hoursWorked: parseFloat(formData.get('hoursWorked') as string) || 0,
      programName: formData.get('programName') as string || undefined,
      fundingClass: formData.get('fundingClass') as string || undefined,
      notes: formData.get('notes') as string || undefined
    }

    const result = await saveTimesheetEntry(timesheet.id, data)
    if (result.error) alert(result.error)
    setIsPending(false)
    setEditingEntry(null)
    setNewEntryDay(null)
  }

  async function handleDeleteEntry(entryId: string) {
    if (!confirm('Delete this entry?')) return
    const result = await deleteTimesheetEntry(entryId)
    if (result.error) alert(result.error)
  }

  async function handleSubmit() {
    if (!confirm('Submit this timesheet for approval?')) return
    setIsPending(true)
    const result = await submitTimesheet(timesheet.id)
    if (result.error) alert(result.error)
    else alert('Timesheet submitted!')
    setIsPending(false)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => navigateWeek(-1)}
          className="p-2 hover:bg-gray-200 rounded-lg"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="font-semibold text-gray-900">
            Week of {formatDate(weekStart)}
          </h2>
          <div className="flex items-center justify-center gap-3 mt-1">
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
              timesheet.status === 'DRAFT' ? 'bg-gray-100 text-gray-600' :
              timesheet.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-700' :
              timesheet.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
              'bg-red-100 text-red-700'
            }`}>
              {timesheet.status}
            </span>
            <span className="text-sm text-gray-500">
              {totalHours.toFixed(1)} hours
            </span>
          </div>
        </div>
        <button
          onClick={() => navigateWeek(1)}
          className="p-2 hover:bg-gray-200 rounded-lg"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Rejection Note */}
      {timesheet.rejectionNote && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <strong>Revision needed:</strong> {timesheet.rejectionNote}
        </div>
      )}

      {/* Entries by Day */}
      <div className="p-6 space-y-4">
        {weekDays.map((day) => {
          const dayStr = day.toISOString().split('T')[0]
          const dayEntries = timesheet.entries.filter(
            e => new Date(e.date).toISOString().split('T')[0] === dayStr
          )
          const isToday = new Date().toISOString().split('T')[0] === dayStr

          return (
            <div
              key={dayStr}
              className={`border rounded-lg ${isToday ? 'border-primary-300 bg-primary-50/30' : 'border-gray-200'}`}
            >
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 rounded-t-lg">
                <span className={`font-medium ${isToday ? 'text-primary-700' : 'text-gray-700'}`}>
                  {formatDate(day)}
                  {isToday && <span className="ml-2 text-xs text-primary-600">(Today)</span>}
                </span>
                {isEditable && (
                  <button
                    onClick={() => setNewEntryDay(day)}
                    className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                )}
              </div>

              <div className="p-3 space-y-2">
                {dayEntries.length === 0 && !newEntryDay?.toISOString().startsWith(dayStr) && (
                  <p className="text-sm text-gray-400 italic">No entries</p>
                )}

                {dayEntries.map((entry) => (
                  <div key={entry.id}>
                    {editingEntry === entry.id ? (
                      <EntryForm
                        entry={entry}
                        date={day}
                        onSubmit={handleSaveEntry}
                        onCancel={() => setEditingEntry(null)}
                        isPending={isPending}
                      />
                    ) : (
                      <div className="flex items-center justify-between p-2 bg-white border border-gray-100 rounded">
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-600">
                            {getTimeValue(entry.checkInTime) || '--:--'} - {getTimeValue(entry.checkOutTime) || '--:--'}
                          </span>
                          <span className="font-medium text-gray-900">{entry.hoursWorked}h</span>
                          {entry.programName && (
                            <span className="text-sm text-gray-500">{entry.programName}</span>
                          )}
                          {entry.fundingClass && (
                            <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                              {entry.fundingClass}
                            </span>
                          )}
                        </div>
                        {isEditable && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingEntry(entry.id)}
                              className="text-sm text-primary-600 hover:text-primary-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {newEntryDay?.toISOString().split('T')[0] === dayStr && (
                  <EntryForm
                    date={day}
                    onSubmit={handleSaveEntry}
                    onCancel={() => setNewEntryDay(null)}
                    isPending={isPending}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Submit Button */}
      {isEditable && timesheet.entries.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit for Approval
          </button>
        </div>
      )}
    </div>
  )
}

// Entry Form Component
function EntryForm({
  entry,
  date,
  onSubmit,
  onCancel,
  isPending
}: {
  entry?: TimesheetEntry
  date: Date
  onSubmit: (formData: FormData) => void
  onCancel: () => void
  isPending: boolean
}) {
  return (
    <form action={onSubmit} className="p-3 bg-gray-50 rounded border border-gray-200 space-y-3">
      <input type="hidden" name="entryId" value={entry?.id || ''} />
      <input type="hidden" name="date" value={date.toISOString().split('T')[0]} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Check In</label>
          <input
            type="time"
            name="checkInTime"
            defaultValue={entry ? getTimeValue(entry.checkInTime) : ''}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Check Out</label>
          <input
            type="time"
            name="checkOutTime"
            defaultValue={entry ? getTimeValue(entry.checkOutTime) : ''}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hours (manual)</label>
          <input
            type="number"
            name="hoursWorked"
            step="0.25"
            min="0"
            max="24"
            defaultValue={entry?.hoursWorked || ''}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Funding Class</label>
          <select
            name="fundingClass"
            defaultValue={entry?.fundingClass || ''}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
          >
            <option value="">Select...</option>
            {FUNDING_CLASSES.map(fc => (
              <option key={fc} value={fc}>{fc}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Program</label>
          <input
            type="text"
            name="programName"
            defaultValue={entry?.programName || ''}
            placeholder="Program name..."
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Notes</label>
          <input
            type="text"
            name="notes"
            defaultValue={entry?.notes || ''}
            placeholder="Optional notes..."
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  )
}
