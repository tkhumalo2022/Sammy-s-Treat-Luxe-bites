import assert from 'node:assert/strict'
import test from 'node:test'

import { createMemoryRateLimiter } from '../src/lib/rate-limit.ts'

test('allows requests up to the limit and blocks the next request', () => {
  const consume = createMemoryRateLimiter({ limit: 2, windowMs: 10_000 })

  assert.deepEqual(consume('visitor', 1_000), {
    allowed: true,
    remaining: 1,
    resetAt: 11_000,
    retryAfterSeconds: 0,
  })
  assert.equal(consume('visitor', 2_000).allowed, true)

  const blocked = consume('visitor', 3_000)
  assert.equal(blocked.allowed, false)
  assert.equal(blocked.remaining, 0)
  assert.equal(blocked.retryAfterSeconds, 8)
})

test('starts a fresh window after expiration', () => {
  const consume = createMemoryRateLimiter({ limit: 1, windowMs: 1_000 })

  assert.equal(consume('visitor', 100).allowed, true)
  assert.equal(consume('visitor', 500).allowed, false)

  const fresh = consume('visitor', 1_100)
  assert.equal(fresh.allowed, true)
  assert.equal(fresh.remaining, 0)
  assert.equal(fresh.resetAt, 2_100)
})
