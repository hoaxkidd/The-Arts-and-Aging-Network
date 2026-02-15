import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const timeEntrySchema = z.object({
  hours: z.number().min(0).max(24),
  date: z.string().transform((str) => new Date(str)),
})

describe('Time Entry Validation', () => {
  it('should validate valid hours', () => {
    const result = timeEntrySchema.safeParse({ hours: 8, date: '2023-01-01' })
    expect(result.success).toBe(true)
  })

  it('should reject hours < 0', () => {
    const result = timeEntrySchema.safeParse({ hours: -1, date: '2023-01-01' })
    expect(result.success).toBe(false)
  })

  it('should reject hours > 24', () => {
    const result = timeEntrySchema.safeParse({ hours: 25, date: '2023-01-01' })
    expect(result.success).toBe(false)
  })

  it('should validate decimal hours', () => {
    const result = timeEntrySchema.safeParse({ hours: 7.5, date: '2023-01-01' })
    expect(result.success).toBe(true)
  })
})
