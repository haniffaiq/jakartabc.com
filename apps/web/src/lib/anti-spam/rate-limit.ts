import { LRUCache } from 'lru-cache'

const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 5

type RateLimitEntry = {
  count: number
  windowStart: number
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfter: number }

const cache = new LRUCache<string, RateLimitEntry>({
  max: 10_000,
  ttl: WINDOW_MS,
})

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now()
  const entry = cache.get(key)

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    cache.set(key, { count: 1, windowStart: now })
    return { allowed: true }
  }

  if (entry.count >= MAX_PER_WINDOW) {
    return {
      allowed: false,
      retryAfter: Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000),
    }
  }

  const nextEntry = { ...entry, count: entry.count + 1 }
  cache.set(key, nextEntry)
  return { allowed: true }
}
