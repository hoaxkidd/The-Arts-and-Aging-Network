'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'

export type MonthPickerValue = { year: number; month: number }

const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

function yearBounds() {
  const y = new Date().getFullYear()
  return { minYear: y - 10, maxYear: y + 1 }
}

type MonthPickerProps = {
  value: MonthPickerValue
  onChange: (next: MonthPickerValue) => void
  disabled?: boolean
  className?: string
  /** For `htmlFor` on an external `<label>`. */
  id?: string
}

export function MonthPicker({ value, onChange, disabled = false, className, id }: MonthPickerProps) {
  const titleId = useId()
  const panelId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(value.year)

  const { minYear, maxYear } = yearBounds()

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setViewYear(value.year)
    }
  }, [open, value.year])

  const triggerLabelLong = `${MONTHS_LONG[value.month - 1]} ${value.year}`
  const triggerLabelShort = `${MONTHS_SHORT[value.month - 1]} ${value.year}`

  function toggle() {
    if (disabled) return
    if (!open) {
      setViewYear(value.year)
    }
    setOpen((o) => !o)
  }

  function selectMonth(month: number) {
    const y = Math.min(maxYear, Math.max(minYear, viewYear))
    onChange({ year: y, month })
    setOpen(false)
  }

  const canPrevYear = viewYear > minYear
  const canNextYear = viewYear < maxYear

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={toggle}
        className={cn(
          STYLES.input,
          'h-9 flex w-full min-w-[8.25rem] max-w-full items-center justify-between gap-2 py-1.5 text-left sm:w-auto sm:min-w-[12rem]',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <span className="min-w-0 truncate sm:hidden">{triggerLabelShort}</span>
        <span className="hidden min-w-0 truncate sm:inline">{triggerLabelLong}</span>
        <Calendar className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
      </button>

      {open && !disabled ? (
        <div
          id={panelId}
          className="absolute left-0 z-50 mt-1 w-[min(100vw-2rem,18rem)] rounded-lg border border-gray-200 bg-white p-3 shadow-lg sm:left-auto sm:right-0"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <p id={titleId} className="sr-only">
            Select month
          </p>
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              className="rounded p-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canPrevYear}
              onClick={() => canPrevYear && setViewYear((y) => y - 1)}
              aria-label="Previous year"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold text-gray-900" aria-live="polite">
              {viewYear}
            </span>
            <button
              type="button"
              className="rounded p-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canNextYear}
              onClick={() => canNextYear && setViewYear((y) => y + 1)}
              aria-label="Next year"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5" role="grid" aria-label={`Months in ${viewYear}`}>
            {MONTHS_SHORT.map((short, i) => {
              const month = i + 1
              const selected = value.year === viewYear && value.month === month
              return (
                <button
                  key={short}
                  type="button"
                  role="gridcell"
                  className={cn(
                    'rounded-md px-2 py-2 text-center text-xs font-medium transition-colors sm:text-sm',
                    selected
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-50 text-gray-800 hover:bg-gray-100'
                  )}
                  aria-label={`${MONTHS_LONG[i]} ${viewYear}`}
                  aria-pressed={selected}
                  onClick={() => selectMonth(month)}
                >
                  {short}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
