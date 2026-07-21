import assert from 'node:assert/strict'
import test from 'node:test'

import { readJsonBody, RequestBodyTooLargeError } from '../src/lib/request-body.ts'

test('parses a JSON request within the byte limit', async () => {
  const request = new Request('https://example.com/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message: 'hello' }),
  })

  assert.deepEqual(await readJsonBody(request, 100), { message: 'hello' })
})

test('rejects streamed bodies that exceed the limit', async () => {
  const encoder = new TextEncoder()
  const request = new Request('https://example.com/api/chat', {
    method: 'POST',
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('{"message":"'))
        controller.enqueue(encoder.encode('too large"}'))
        controller.close()
      },
    }),
    duplex: 'half',
  } as RequestInit & { duplex: 'half' })

  await assert.rejects(readJsonBody(request, 12), RequestBodyTooLargeError)
})
