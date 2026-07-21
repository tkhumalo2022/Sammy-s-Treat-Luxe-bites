'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import Image from 'next/image'
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { BUSINESS_DETAILS } from '@/lib/business'

const STORAGE_KEY = 'luxe-bites-chat-v1'
const SUGGESTIONS = [
  'Show me the menu and prices',
  'What is the minimum order?',
  'How does delivery work?',
  'Help me prepare an order',
]

function messageText(message: UIMessage) {
  return message.parts
    .filter((part): part is Extract<typeof part, { type: 'text' }> => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

function isStoredConversation(value: unknown): value is UIMessage[] {
  return Array.isArray(value)
    && value.length <= 24
    && value.every((message) => {
      if (!message || typeof message !== 'object') return false
      const candidate = message as Partial<UIMessage>
      return typeof candidate.id === 'string'
        && (candidate.role === 'user' || candidate.role === 'assistant')
        && Array.isArray(candidate.parts)
        && candidate.parts.every((part) => (
          part.type === 'text'
          && typeof part.text === 'string'
          && part.text.length <= 1_000
        ))
    })
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const restoreLauncherFocusRef = useRef(false)
  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/chat' }), [])
  const {
    messages,
    sendMessage,
    setMessages,
    status,
    error,
    regenerate,
    stop,
    clearError,
  } = useChat({
    id: 'luxe-bites-assistant',
    transport,
    experimental_throttle: 40,
  })

  const isBusy = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed: unknown = JSON.parse(saved)
        if (isStoredConversation(parsed)) setMessages(parsed)
        else window.localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY)
    } finally {
      setHydrated(true)
    }
  }, [setMessages])

  useEffect(() => {
    if (!hydrated || status !== 'ready') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch {
      // The assistant remains usable when storage is unavailable or full.
    }
  }, [hydrated, messages, status])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (isOpen) inputRef.current?.focus()
      else if (restoreLauncherFocusRef.current) {
        launcherRef.current?.focus()
        restoreLauncherFocusRef.current = false
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isOpen])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, status])

  function submit(text: string) {
    const value = text.trim()
    if (!value || isBusy) return
    clearError()
    void sendMessage({ text: value })
    setInput('')
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    submit(input)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit(input)
    }
  }

  function newConversation() {
    stop()
    clearError()
    setMessages([])
    setInput('')
    window.localStorage.removeItem(STORAGE_KEY)
  }

  function closeConversation(restoreFocus = true) {
    restoreLauncherFocusRef.current = restoreFocus
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <button
        ref={launcherRef}
        className="chat-launcher"
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open Luxe Bites assistant"
        aria-haspopup="dialog"
      >
        <span className="chat-launcher-pulse" />
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 4h16v12H8l-4 4V4Zm4 5h8M8 12h5" />
        </svg>
      </button>
    )
  }

  return (
    <section
      className="chat-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="chat-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') closeConversation()
      }}
    >
      <header className="chat-header">
        <div className="chat-identity">
          <Image src="/images/logo.jpeg" width={42} height={42} alt="Luxe Bites logo" />
          <div>
            <strong id="chat-title">Luxe Bites Assistant</strong>
            <span><i /> Menu &amp; order help</span>
          </div>
        </div>
        <div className="chat-actions">
          <a href="#order" onClick={() => closeConversation(false)} title="Go to order form">Order</a>
          <button type="button" onClick={newConversation} aria-label="Start a new conversation" title="New conversation">
            ↻
          </button>
          <button type="button" onClick={() => closeConversation()} aria-label="Close assistant" title="Close">
            ×
          </button>
        </div>
      </header>

      <div className="chat-messages" aria-live="polite">
        <div className="chat-bubble assistant">
          Hi! I’m the Luxe Bites Assistant. I can help with flavours, prices, delivery, and preparing your order. What would you like to know?
        </div>

        {messages.map((message) => {
          const text = messageText(message)
          if (!text) return null
          return (
            <div className={`chat-row ${message.role}`} key={message.id}>
              <div className={`chat-bubble ${message.role}`}>{text}</div>
            </div>
          )
        })}

        {messages.length === 0 && (
          <div className="chat-suggestions">
            {SUGGESTIONS.map((suggestion) => (
              <button type="button" key={suggestion} onClick={() => submit(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {status === 'submitted' && (
          <div className="typing-indicator" aria-label="Assistant is typing"><span /><span /><span /></div>
        )}

        {error && (
          <div className="chat-error" role="alert">
            <span>The assistant is temporarily unavailable.</span>
            <div>
              <button type="button" onClick={() => void regenerate()}>Retry</button>
              <a href={`https://wa.me/${BUSINESS_DETAILS.whatsappNumber}`} target="_blank" rel="noreferrer">WhatsApp</a>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      <form className="chat-composer" onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value.slice(0, 1_000))}
          onKeyDown={handleKeyDown}
          placeholder="Ask about flavours or your order…"
          rows={1}
          disabled={isBusy}
          maxLength={1_000}
          aria-label="Message Luxe Bites Assistant"
        />
        {isBusy ? (
          <button type="button" onClick={stop} className="chat-stop" aria-label="Stop response">■</button>
        ) : (
          <button type="submit" disabled={!input.trim()} aria-label="Send message">➤</button>
        )}
      </form>
      <p className="chat-disclaimer">AI may make mistakes. Chat history stays on this device. Sam confirms every order.</p>
    </section>
  )
}
