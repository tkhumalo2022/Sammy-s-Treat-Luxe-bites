import type { UIMessage } from 'ai'

export const MAX_CHAT_MESSAGES = 24
export const MAX_MESSAGE_CHARACTERS = 1_000
export const MAX_CONVERSATION_CHARACTERS = 12_000

export function getMessageText(message: UIMessage) {
  return message.parts
    .filter((part): part is Extract<typeof part, { type: 'text' }> => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

export function validateChatConversation(messages: UIMessage[]) {
  if (messages.length === 0) return 'At least one message is required.'
  if (messages.length > MAX_CHAT_MESSAGES) return 'Please start a new conversation.'
  if (messages.at(-1)?.role !== 'user') return 'The last message must be from the visitor.'

  let totalCharacters = 0

  for (const message of messages) {
    if (message.role !== 'user' && message.role !== 'assistant') {
      return 'Unsupported message role.'
    }

    if (message.parts.some((part) => part.type !== 'text')) {
      return 'Only text messages are supported.'
    }

    const text = getMessageText(message).trim()
    if (!text) return 'Messages cannot be empty.'
    if (text.length > MAX_MESSAGE_CHARACTERS) return 'A message is too long.'

    totalCharacters += text.length
  }

  if (totalCharacters > MAX_CONVERSATION_CHARACTERS) {
    return 'Please start a new conversation.'
  }

  return null
}
