export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfterSeconds: number
}

type Entry = {
  count: number
  resetAt: number
}

export function createMemoryRateLimiter(options: {
  limit: number
  windowMs: number
  maxEntries?: number
}) {
  const { limit, windowMs, maxEntries = 5_000 } = options
  const entries = new Map<string, Entry>()

  return (key: string, now = Date.now()): RateLimitResult => {
    const current = entries.get(key)
    const entry = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current

    entry.count += 1
    entries.set(key, entry)

    if (entries.size > maxEntries) {
      for (const [storedKey, storedEntry] of entries) {
        if (storedEntry.resetAt <= now || entries.size > maxEntries) {
          entries.delete(storedKey)
        }
        if (entries.size <= maxEntries) break
      }
    }

    const allowed = entry.count <= limit
    const retryAfterSeconds = allowed
      ? 0
      : Math.max(1, Math.ceil((entry.resetAt - now) / 1_000))

    return {
      allowed,
      remaining: Math.max(0, limit - entry.count),
      resetAt: entry.resetAt,
      retryAfterSeconds,
    }
  }
}
