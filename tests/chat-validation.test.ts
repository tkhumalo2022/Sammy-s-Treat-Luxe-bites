import assert from 'node:assert/strict'
import test from 'node:test'
import type { UIMessage } from 'ai'

import {
  MAX_CHAT_MESSAGES,
  MAX_MESSAGE_CHARACTERS,
  validateChatConversation,
} from '../src/lib/chat-validation.ts'

function message(id: string, role: 'user' | 'assistant', text: string): UIMessage {
  return { id, role, parts: [{ type: 'text', text }] }
}

test('accepts a valid conversation ending with a visitor message', () => {
  const result = validateChatConversation([
    message('1', 'user', 'What is the minimum order?'),
    message('2', 'assistant', 'The minimum is 10 desserts.'),
    message('3', 'user', 'Can I collect?'),
  ])

  assert.equal(result, null)
})

test('rejects empty, oversized, and assistant-final conversations', () => {
  assert.equal(validateChatConversation([]), 'At least one message is required.')
  assert.equal(
    validateChatConversation([message('1', 'user', 'a'.repeat(MAX_MESSAGE_CHARACTERS + 1))]),
    'A message is too long.',
  )
  assert.equal(
    validateChatConversation([message('1', 'assistant', 'Hello')]),
    'The last message must be from the visitor.',
  )
})

test('limits the number of conversation turns', () => {
  const messages = Array.from({ length: MAX_CHAT_MESSAGES + 1 }, (_, index) =>
    message(String(index), 'user', 'Hello'),
  )

  assert.equal(validateChatConversation(messages), 'Please start a new conversation.')
})

test('rejects non-text message parts', () => {
  const messages = [{
    id: '1',
    role: 'user',
    parts: [{ type: 'file', mediaType: 'image/png', url: 'https://example.com/a.png' }],
  }] as UIMessage[]

  assert.equal(validateChatConversation(messages), 'Only text messages are supported.')
})
