const trackers = new Map<string, { count: number; expiresAt: number }>()
let cleanupInterval: NodeJS.Timeout | null = null

function cleanup() {
  const now = Date.now()
  for (const [key, value] of trackers) {
    if (value.expiresAt < now) {
      trackers.delete(key)
    }
  }
}

export function startCleanupInterval() {
  if (cleanupInterval === null && typeof setInterval !== 'undefined') {
    cleanupInterval = setInterval(cleanup, 5 * 60 * 1000)
  }
}

export function stopCleanupInterval() {
  if (cleanupInterval !== null) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }
}

export function resetRateLimit() {
  trackers.clear()
}

export function rateLimit(key: string, limit: number = 5, windowMs: number = 60000) {
  const now = Date.now()
  
  const record = trackers.get(key)

  if (!record || record.expiresAt < now) {
    trackers.set(key, { count: 1, expiresAt: now + windowMs })
    return { success: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0, resetAt: record.expiresAt }
  }

  const newCount = record.count + 1
  trackers.set(key, { count: newCount, expiresAt: record.expiresAt })
  return { success: true, remaining: limit - newCount, resetAt: record.expiresAt }
}

startCleanupInterval()
