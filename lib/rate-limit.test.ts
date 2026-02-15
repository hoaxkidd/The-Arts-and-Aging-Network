import { describe, it, expect, beforeEach } from 'vitest'
import { rateLimit } from './rate-limit'

describe('rateLimit', () => {
  it('should allow requests under the limit', () => {
    const ip = '127.0.0.1'
    expect(rateLimit(ip, 2, 1000)).toBe(true)
    expect(rateLimit(ip, 2, 1000)).toBe(true)
  })

  it('should block requests over the limit', () => {
    const ip = '127.0.0.2'
    expect(rateLimit(ip, 1, 1000)).toBe(true)
    expect(rateLimit(ip, 1, 1000)).toBe(false)
  })
})
