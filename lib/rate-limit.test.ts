import { describe, it, expect, beforeEach } from 'vitest'
import { rateLimit, resetRateLimit } from './rate-limit'

describe('rateLimit', () => {
  beforeEach(() => {
    resetRateLimit()
  })

  it('should allow requests under the limit', () => {
    const ip = '127.0.0.1'
    expect(rateLimit(ip, 2, 1000).success).toBe(true)
    expect(rateLimit(ip, 2, 1000).success).toBe(true)
  })

  it('should block requests over the limit', () => {
    const ip = '127.0.0.2'
    expect(rateLimit(ip, 1, 1000).success).toBe(true)
    expect(rateLimit(ip, 1, 1000).success).toBe(false)
  })

  it('should return remaining count correctly', () => {
    const ip = '127.0.0.3'
    const result1 = rateLimit(ip, 3, 1000)
    expect(result1.remaining).toBe(2)
    const result2 = rateLimit(ip, 3, 1000)
    expect(result2.remaining).toBe(1)
    const result3 = rateLimit(ip, 3, 1000)
    expect(result3.remaining).toBe(0)
  })

  it('should reset after window expires', async () => {
    const ip = '127.0.0.4'
    expect(rateLimit(ip, 1, 100).success).toBe(true)
    expect(rateLimit(ip, 1, 100).success).toBe(false)
    await new Promise(resolve => setTimeout(resolve, 150))
    expect(rateLimit(ip, 1, 100).success).toBe(true)
  })
})
