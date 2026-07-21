import assert from 'node:assert/strict'
import test from 'node:test'

import { getClientKey, isSameOriginRequest } from '../src/lib/request-security.ts'

test('accepts a matching browser origin', () => {
  const request = new Request('https://luxe.example/api/chat', {
    headers: { host: 'luxe.example', origin: 'https://luxe.example' },
  })

  assert.equal(isSameOriginRequest(request), true)
})

test('rejects cross-origin and malformed browser origins', () => {
  const crossOrigin = new Request('https://luxe.example/api/chat', {
    headers: { host: 'luxe.example', origin: 'https://attacker.example' },
  })
  const malformed = new Request('https://luxe.example/api/chat', {
    headers: { host: 'luxe.example', origin: 'not a URL' },
  })

  assert.equal(isSameOriginRequest(crossOrigin), false)
  assert.equal(isSameOriginRequest(malformed), false)
})

test('uses the first forwarded address without exposing it outside the limiter key', () => {
  const request = new Request('https://luxe.example/api/orders', {
    headers: { 'x-forwarded-for': '203.0.113.8, 10.0.0.1' },
  })

  assert.equal(getClientKey(request, 'order'), 'order:203.0.113.8')
})
