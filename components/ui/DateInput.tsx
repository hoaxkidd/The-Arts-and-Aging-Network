'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { parseDMYDate, parseISODate, toInputDate, formatDateWords } from '@/lib/date-utils'

interface DateInputProps {
  name: string
  value?: string | Date | null
  onChange?: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  label?: string
  isDateOfBirth?: boolean
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const YEARS = Array.from({ length: 201 }, (_, i) => 1900 + i) // 1900-2100

export function DateInput({
  name,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  className = '',
  label,
  isDateOfBirth = false
}: DateInputProps) {
  const displayPlaceholder = placeholder ?? (isDateOfBirth ? 'DD-MM-YYYY (Date of Birth)' : 'DD-MM-YYYY')
  const [inputValue, setInputValue] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [viewMonth, setViewMonth] = useState(new Date().getMonth())
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [error, setError] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const isUserTyping = useRef(false)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const maxYear = isDateOfBirth ? today.getFullYear() - 1 : undefined

  // Initialize from value
  useEffect(() => {
    if (!isUserTyping.current && value) {
      let date: Date | null = null
      
      if (typeof value === 'string' && value.match(/^\d{2}-\d{2}-\d{4}$/)) {
        date = parseISODate(value)
      } else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = value.split('-')
        date = parseISODate(`${day}-${month}-${year}`)
      } else if (typeof value === 'string') {
        date = parseDMYDate(value)
      } else if (value instanceof Date) {
        date = value
      }
      
      if (date) {
        setInputValue(toInputDate(date))
        setViewMonth(date.getMonth())
        setViewYear(date.getFullYear())
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

  // Get selected date from inputValue
  const getSelectedDate = (): Date | null => {
    if (!inputValue) return null
    if (inputValue.match(/^\d{2}-\d{2}-\d{4}$/)) {
      return parseISODate(inputValue)
    }
    return null
  }

  // Generate calendar days for the current view
  const getCalendarDays = () => {
    const days: (number | null)[] = []
    const firstDay = new Date(viewYear, viewMonth, 1).getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    
    // Empty cells for days before first of month
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    
    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    
    return days
  }

  // Handle day selection
  const handleDayClick = (day: number) => {
    const selectedDate = new Date(viewYear, viewMonth, day)
    selectedDate.setHours(0, 0, 0, 0)
    
    // Validate for DOB fields
    if (isDateOfBirth && selectedDate >= today) {
      setError('Date of birth must be in the past')
      return
    }
    
    const formatted = toInputDate(selectedDate)
    setInputValue(formatted)
    setError('')
    onChange?.(formatted)
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
  }

  // Handle clear button
  const handleClear = () => {
    setInputValue('')
    setError('')
    onChange?.('')
    setShowPicker(false)
  }

  // Handle text input
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isUserTyping.current = true
    let val = e.target.value.replace(/[^\d-]/g, '')
    
    const isDeleting = inputValue && val.length < inputValue.length
    
    if (!isDeleting) {
      if (val.length === 2 && !val.includes('-')) {
        val = val + '-'
      } else if (val.length === 5 && !val.includes('-', 3)) {
        val = val + '-'
      }
    }
    
    if (val.length > 10) {
      isUserTyping.current = false
      return
    }
    
    setInputValue(val)
    setError('')
    
    if (val.length === 10 && val.includes('-')) {
      const parsed = parseISODate(val)
      if (parsed) {
        parsed.setHours(0, 0, 0, 0)
        if (isDateOfBirth && parsed >= today) {
          setError('Date of birth must be in the past')
        } else {
          const formatted = toInputDate(parsed)
          setInputValue(formatted)
          setError('')
          onChange?.(formatted)
        }
      } else {
        setError('Invalid date')
      }
    } else if (val.length === 0) {
      onChange?.('')
    }
    isUserTyping.current = false
  }

  // Handle text input blur
  const handleTextBlur = () => {
    isUserTyping.current = false
    if (inputValue.length === 0) return
    
    if (inputValue.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const parsed = parseISODate(inputValue)
      if (parsed) {
        parsed.setHours(0, 0, 0, 0)
        if (isDateOfBirth && parsed >= today) {
          setError('Date of birth must be in the past')
        } else {
          const formatted = toInputDate(parsed)
          setInputValue(formatted)
          setViewMonth(parsed.getMonth())
          setViewYear(parsed.getFullYear())
          onChange?.(formatted)
          setError('')
        }
      } else {
        setError('Invalid date format')
      }
    } else if (inputValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = inputValue.split('-')
      const converted = `${day}-${month}-${year}`
      const parsed = parseISODate(converted)
      if (parsed) {
        parsed.setHours(0, 0, 0, 0)
        if (isDateOfBirth && parsed >= today) {
          setError('Date of birth must be in the past')
        } else {
          setInputValue(converted)
          setViewMonth(parsed.getMonth())
          setViewYear(parsed.getFullYear())
          onChange?.(converted)
          setError('')
        }
      } else {
        setError('Invalid date')
      }
    }
  }

  // Get preview date
  const getPreviewDate = (): Date | null => {
    const dateValue = inputValue || value
    if (!dateValue) return null
    
    if (typeof dateValue === 'string' && dateValue.match(/^\d{2}-\d{2}-\d{4}$/)) {
      return parseISODate(dateValue)
    }
    
    if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateValue.split('-')
      return parseISODate(`${day}-${month}-${year}`)
    }
    
    const d = new Date(dateValue)
    return isNaN(d.getTime()) ? null : d
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
      
      <div className="relative">
        {/* Text input for manual typing */}
        <input
          type="text"
          name={name}
          value={inputValue}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          placeholder={displayPlaceholder}
          disabled={disabled}
          required={required}
          className={`
            w-full px-3 py-2 pr-10 border rounded-lg text-gray-900 placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${error ? 'border-red-500' : 'border-gray-300'}
            ${className}
          `}
        />
        
        {/* Calendar icon button */}
        <button
          type="button"
          onClick={() => !disabled && setShowPicker(!showPicker)}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <Calendar className="w-4 h-4" />
        </button>
      </div>

      {/* Custom Calendar Dropdown */}
      {showPicker && !disabled && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-72">
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
              
              const selectedDateObj = new Date(viewYear, viewMonth, day)
              selectedDateObj.setHours(0, 0, 0, 0)
              const isFutureDate = isDateOfBirth && selectedDateObj > today
              
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
                  disabled={isFutureDate}
                  className={`
                    h-8 w-8 flex items-center justify-center rounded-full text-sm
                    ${isSelected ? 'bg-primary-500 text-white' : ''}
                    ${!isSelected && isToday && !isFutureDate ? 'bg-primary-100 text-primary-700 font-medium' : ''}
                    ${!isSelected && !isToday && !isFutureDate ? 'hover:bg-gray-100 text-gray-700' : ''}
                    ${isFutureDate ? 'opacity-30 cursor-not-allowed text-gray-400' : ''}
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
            {isDateOfBirth ? (
              <span className="text-xs text-gray-500">Select a past date</span>
            ) : (
              <button
                type="button"
                onClick={handleToday}
                className="px-3 py-1 text-sm bg-primary-500 text-white rounded hover:bg-primary-600"
              >
                Today
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}

      {previewDate && !error && (
        <p className="mt-1 text-xs text-gray-500">
          {formatDateWords(previewDate)}
        </p>
      )}
    </div>
  )
}
