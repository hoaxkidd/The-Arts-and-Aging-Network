'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'
import { formatTime, parseHMTime, toInputTime } from '@/lib/date-utils'

interface TimeInputProps {
  name: string
  value?: string | Date | null
  onChange?: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  label?: string
}

export function TimeInput({
  name,
  value,
  onChange,
  placeholder = 'HH:MM',
  required = false,
  disabled = false,
  className = '',
  label
}: TimeInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')

  // Initialize from value
  const initValue = () => {
    if (value) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        return toInputTime(date)
      }
    }
    return ''
  }

  // Handle manual input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^\d:]/g, '')
    
    // Auto-add colon
    if (val.length === 2 && !val.includes(':')) {
      val = val + ':'
    } else if (val.length > 2 && val[2] !== ':') {
      val = val.slice(0, 2) + ':' + val.slice(2)
    }
    
    // Limit to 5 characters (HH:MM)
    if (val.length > 5) return
    
    setInputValue(val)
    setError('')
    
    if (val.length === 5) {
      const parsed = parseHMTime(val)
      if (parsed) {
        onChange?.(val)
      } else {
        setError('Invalid time')
      }
    } else if (val.length === 0) {
      onChange?.('')
    }
  }

  // Handle blur - validate
  const handleBlur = () => {
    if (inputValue.length === 0) return
    
    const parsed = parseHMTime(inputValue)
    if (parsed) {
      const timeStr = toInputTime(parsed)
      setInputValue(timeStr)
      onChange?.(timeStr)
    } else {
      setError('Invalid time format')
    }
  }

  // Get preview
  const previewTime = value ? new Date(value) : null

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          type="text"
          name={name}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            w-full px-3 py-2 pl-10 border rounded-lg text-gray-900 placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${error ? 'border-red-500' : 'border-gray-300'}
            ${className}
          `}
        />
        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}

      {/* Preview */}
      {previewTime && !error && (
        <p className="mt-1 text-xs text-gray-500">
          {formatTime(previewTime)}
        </p>
      )}
    </div>
  )
}
