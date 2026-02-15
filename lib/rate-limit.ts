const trackers = new Map<string, { count: number; expiresAt: number }>()

// Cleanup old entries periodically (every 5 minutes)
function cleanup() {
  const now = Date.now()
  for (const [key, value] of trackers) {
    if (value.expiresAt < now) {
      trackers.delete(key)
    }
  }
}

// Start cleanup interval
if (typeof setInterval !== 'undefined') {
    setInterval(cleanup, 5 * 60 * 1000)
}

export function rateLimit(key: string, limit: number = 5, windowMs: number = 60000) {
  const now = Date.now()
  const record = trackers.get(key)

  if (!record || record.expiresAt < now) {
    trackers.set(key, { count: 1, expiresAt: now + windowMs })
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}
