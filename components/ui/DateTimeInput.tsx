'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react'
import { toInputDate, toInputTime, formatDateTimeWords, parseDMYDate, parseHMTime, parseISODate } from '@/lib/date-utils'

interface DateTimeInputProps {
  name: string
  value?: string | Date | null
  onChange?: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  label?: string
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const YEARS = Array.from({ length: 201 }, (_, i) => 1900 + i)

export function DateTimeInput({
  name,
  value,
  onChange,
  placeholder = 'DD-MM-YYYY HH:MM',
  required = false,
  disabled = false,
  className = '',
  label
}: DateTimeInputProps) {
  const [dateValue, setDateValue] = useState('')
  const [timeValue, setTimeValue] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [viewMonth, setViewMonth] = useState(new Date().getMonth())
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [error, setError] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize from value
  useEffect(() => {
    if (value) {
      let dateStr = ''
      let timeStr = ''
      
      if (typeof value === 'string' && value.match(/^\d{2}-\d{2}-\d{4}/)) {
        // DD-MM-YYYY format (no time)
        dateStr = value
      } else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}[T ]/)) {
        // YYYY-MM-DDTHH:MM:SS format - extract BOTH date AND time
        const parts = value.split(/[T ]/)
        if (parts[0]) {
          const [year, month, day] = parts[0].split('-')
          const paddedMonth = month.padStart(2, '0')
          dateStr = `${day}-${paddedMonth}-${year}`
        }
        // Extract time DIRECTLY from original string (NOT from Date object!)
        if (parts[1]) {
          const timeMatch = parts[1].match(/^(\d{2}):(\d{2})/)
          if (timeMatch) {
            timeStr = `${timeMatch[1]}:${timeMatch[2]}`
          }
        }
      } else if (value instanceof Date) {
        dateStr = toInputDate(value)
        timeStr = toInputTime(value)
      }
      
      if (dateStr) {
        setDateValue(dateStr)
      }
      if (timeStr) {
        setTimeValue(timeStr)
      }
    }
  }, [value])

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPicker])

  // Generate calendar days
  const getCalendarDays = () => {
    const days: (number | null)[] = []
    const firstDay = new Date(viewYear, viewMonth, 1).getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    
    return days
  }

  // Handle date selection from calendar
  const handleDayClick = (day: number) => {
    const selectedDate = new Date(viewYear, viewMonth, day)
    const formatted = toInputDate(selectedDate)
    setDateValue(formatted)
    setError('')
    updateValue(formatted, timeValue)
    setShowPicker(false)
  }

  // Handle previous month
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  // Handle next month
  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  // Handle today button
  const handleToday = () => {
    const today = new Date()
    setViewMonth(today.getMonth())
    setViewYear(today.getFullYear())
    setDateValue(toInputDate(today))
    const hours = today.getHours().toString().padStart(2, '0')
    const minutes = today.getMinutes().toString().padStart(2, '0')
    setTimeValue(`${hours}:${minutes}`)
    updateValue(toInputDate(today), `${hours}:${minutes}`)
  }

  // Handle clear button
  const handleClear = () => {
    setDateValue('')
    setTimeValue('')
    setError('')
    onChange?.('')
    setShowPicker(false)
  }

  // Handle date input
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^\d-]/g, '')
    
    const isDeleting = dateValue && val.length < dateValue.length
    
    if (!isDeleting) {
      if (val.length === 2 && !val.includes('-')) {
        val = val + '-'
      } else if (val.length === 5 && !val.includes('-', 3)) {
        val = val + '-'
      }
    }
    
    if (val.length > 10) return
    
    setDateValue(val)
    setError('')
    updateValue(val, timeValue)
  }

  // Handle time input
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^\d:]/g, '')
    
    if (val.length === 2 && !val.includes(':')) {
      val = val + ':'
    } else if (val.length > 2 && val[2] !== ':') {
      val = val.slice(0, 2) + ':' + val.slice(2)
    }
    
    if (val.length > 5) return
    
    setTimeValue(val)
    setError('')
    updateValue(dateValue, val)
  }

  // Handle blur - validate
  const handleBlur = () => {
    if (dateValue.length > 0) {
      const parsedDate = dateValue.match(/^\d{2}-\d{2}-\d{4}$/) ? parseISODate(dateValue) : parseDMYDate(dateValue)
      if (parsedDate) {
        setDateValue(toInputDate(parsedDate))
        if (timeValue.length === 5) {
          const parsedTime = parseHMTime(timeValue)
          if (parsedTime) {
            parsedDate.setHours(parsedTime.getHours(), parsedTime.getMinutes())
            updateValue(toInputDate(parsedDate), toInputTime(parsedDate))
          }
        }
      }
    }
  }

  // Update combined value
  const getCombinedValue = (date: string, time: string): string => {
    if (date.length === 10 && time.length === 5) {
      const [day, month, year] = date.split('-')
      return `${year}-${month}-${day}T${time}:00`
    }
    return ''
  }

  const updateValue = (date: string, time: string) => {
    const combined = getCombinedValue(date, time)
    if (combined) {
      onChange?.(combined)
    } else if (date.length === 0 && time.length === 0) {
      onChange?.('')
    }
  }

  // Get selected date for calendar highlighting
  const getSelectedDate = (): Date | null => {
    if (!dateValue) return null
    if (dateValue.match(/^\d{2}-\d{2}-\d{4}$/)) {
      return parseISODate(dateValue)
    }
    return null
  }

  // Get preview date
  const getPreviewDate = (): Date | null => {
    if (!dateValue && !value) return null
    
    let date: Date | null = null
    
    if (dateValue && dateValue.match(/^\d{2}-\d{2}-\d{4}$/)) {
      date = parseISODate(dateValue)
    } else if (value) {
      date = new Date(value)
    }
    
    if (date && timeValue.match(/^\d{2}:\d{2}$/)) {
      const [hours, minutes] = timeValue.split(':').map(Number)
      date.setHours(hours, minutes)
    }
    
    return date && !isNaN(date.getTime()) ? date : null
  }

  const selectedDate = getSelectedDate()
  const calendarDays = getCalendarDays()
  const previewDate = getPreviewDate()

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="flex gap-2">
        <input type="hidden" name={name} value={getCombinedValue(dateValue, timeValue)} />
        {/* Date input */}
        <div className="relative flex-1">
          <input
            type="text"
            name={`${name}_date`}
            value={dateValue}
            onChange={handleDateChange}
            onBlur={handleBlur}
            placeholder="DD-MM-YYYY"
            disabled={disabled}
            required={required}
            className={`
              w-full px-3 py-2 pr-10 border rounded-lg text-gray-900 placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400
              disabled:bg-gray-100 disabled:cursor-not-allowed
              ${error ? 'border-red-500' : 'border-gray-300'}
              ${className}
            `}
          />
          <button
            type="button"
            onClick={() => !disabled && setShowPicker(!showPicker)}
            disabled={disabled}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>
        
        {/* Time input */}
        <div className="relative w-28">
          <input
            type="text"
            name={`${name}_time`}
            value={timeValue}
            onChange={handleTimeChange}
            onBlur={handleBlur}
            placeholder="HH:MM"
            disabled={disabled}
            className={`
              w-full px-3 py-2 border rounded-lg text-gray-900 placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400
              disabled:bg-gray-100 disabled:cursor-not-allowed
              ${error ? 'border-red-500' : 'border-gray-300'}
              ${className}
            `}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <Clock className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Custom Calendar Dropdown */}
      {showPicker && !disabled && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-72 left-0">
          {/* Month/Year Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm font-medium"
              >
                {MONTHS.map((month, idx) => (
                  <option key={month} value={idx}>{month}</option>
                ))}
              </select>
              
              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm font-medium"
              >
                {YEARS.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-8" />
              }
              
              const isSelected = selectedDate && 
                selectedDate.getDate() === day && 
                selectedDate.getMonth() === viewMonth && 
                selectedDate.getFullYear() === viewYear
              
              const isToday = new Date().getDate() === day &&
                new Date().getMonth() === viewMonth &&
                new Date().getFullYear() === viewYear
              
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`
                    h-8 w-8 flex items-center justify-center rounded-full text-sm
                    ${isSelected ? 'bg-gray-900 text-white' : ''}
                    ${!isSelected && isToday ? 'bg-gray-200 text-gray-900 font-medium' : ''}
                    ${!isSelected && !isToday ? 'hover:bg-gray-100 text-gray-700' : ''}
                  `}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-100"
            >
              Now
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}

      {/* Preview in words */}
      {previewDate && !error && (
        <p className="mt-1 text-xs text-gray-500">
          {formatDateTimeWords(previewDate)}
        </p>
      )}
    </div>
  )
}
