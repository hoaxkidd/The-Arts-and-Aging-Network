'use client'

import { useState } from 'react'
import { formatPhoneDashed } from '@/lib/phone'
import { cn } from '@/lib/utils'

type PhoneInputProps = {
  id?: string
  name: string
  defaultValue?: string | null
  placeholder?: string
  className?: string
  required?: boolean
  disabled?: boolean
}

export function PhoneInput({
  id,
  name,
  defaultValue,
  placeholder = '555-123-4567',
  className,
  required,
  disabled,
}: PhoneInputProps) {
  const [value, setValue] = useState(formatPhoneDashed(defaultValue || ''))

  return (
    <input
      id={id}
      name={name}
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      value={value}
      onChange={(e) => setValue(formatPhoneDashed(e.target.value))}
      placeholder={placeholder}
      className={cn('w-full rounded-lg border-gray-300', className)}
      required={required}
      disabled={disabled}
    />
  )
}
