import { createGoogleGenerativeAI, type GoogleLanguageModelOptions } from '@ai-sdk/google'
import {
  convertToModelMessages,
  streamText,
  type UIMessage,
  validateUIMessages,
} from 'ai'
import { NextResponse } from 'next/server'

import { CHAT_INSTRUCTIONS } from '@/lib/business'
import { validateChatConversation } from '@/lib/chat-validation'
import { createMemoryRateLimiter } from '@/lib/rate-limit'
import { readJsonBody, RequestBodyTooLargeError } from '@/lib/request-body'
import { getClientKey, isSameOriginRequest } from '@/lib/request-security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const MAX_REQUEST_BYTES = 20_000
const GEMINI_PRIMARY_MODEL = 'gemini-3.5-flash'
const GEMINI_FALLBACK_MODEL = 'gemini-3.1-flash-lite'
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504])
const consumeChatLimit = createMemoryRateLimiter({
  limit: 12,
  windowMs: 10 * 60 * 1_000,
})

type FetchInput = Parameters<typeof fetch>[0]
type FetchInit = Parameters<typeof fetch>[1]

function requestUrl(input: FetchInput) {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

function requestWithModel(input: FetchInput, model: string): FetchInput {
  const currentUrl = requestUrl(input)
  const modelPattern = /\/models\/[^/:]+:/
  const nextUrl = currentUrl.replace(modelPattern, `/models/${model}:`)

  if (input instanceof Request) {
    return new Request(nextUrl, input.clone())
  }

  return nextUrl
}

function fetchAttempt(input: FetchInput, init: FetchInit, model: string) {
  return fetch(requestWithModel(input, model), init)
}

function isRetryableResponse(response: Response) {
  return RETRYABLE_STATUS_CODES.has(response.status)
}

async function waitBeforeRetry(delayMs: number, signal?: AbortSignal | null) {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException('The request was aborted.', 'AbortError')
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(resolve, delayMs)

    if (!signal) return

    signal.addEventListener('abort', () => {
      clearTimeout(timeout)
      reject(signal.reason ?? new DOMException('The request was aborted.', 'AbortError'))
    }, { once: true })
  })
}

async function resilientGeminiFetch(input: FetchInput, init?: FetchInit) {
  const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined)
  const attempts = [
    { model: GEMINI_PRIMARY_MODEL, delayMs: 0 },
    { model: GEMINI_PRIMARY_MODEL, delayMs: 350 },
    { model: GEMINI_FALLBACK_MODEL, delayMs: 250 },
    { model: GEMINI_FALLBACK_MODEL, delayMs: 750 },
  ] as const

  let lastResponse: Response | undefined

  for (const [index, attempt] of attempts.entries()) {
    if (attempt.delayMs > 0) {
      const jitterMs = Math.floor(Math.random() * 120)
      await waitBeforeRetry(attempt.delayMs + jitterMs, signal)
    }

    const response = await fetchAttempt(input, init, attempt.model)
    lastResponse = response

    if (!isRetryableResponse(response) || index === attempts.length - 1) {
      return response
    }

    console.warn('Gemini temporarily unavailable; retrying chat request.', {
      model: attempt.model,
      status: response.status,
      nextModel: attempts[index + 1]?.model,
    })

    await response.body?.cancel().catch(() => undefined)
  }

  return lastResponse ?? fetchAttempt(input, init, GEMINI_FALLBACK_MODEL)
}

const google = createGoogleGenerativeAI({
  fetch: resilientGeminiFetch,
})

function rateLimitHeaders(result: ReturnType<typeof consumeChatLimit>) {
  return {
    'Cache-Control': 'no-store',
    'X-RateLimit-Limit': '12',
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1_000)),
  }
}

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      configured: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
      provider: 'google',
      model: GEMINI_PRIMARY_MODEL,
      fallbackModel: GEMINI_FALLBACK_MODEL,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function POST(request: Request) {
  const rateLimit = consumeChatLimit(getClientKey(request, 'chat'))
  const headers = rateLimitHeaders(rateLimit)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many messages. Please wait a few minutes and try again.' },
      {
        status: 429,
        headers: { ...headers, 'Retry-After': String(rateLimit.retryAfterSeconds) },
      },
    )
  }

  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Cross-origin requests are not allowed.' }, { status: 403, headers })
  }

  if (!request.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'JSON is required.' }, { status: 415, headers })
  }

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: 'The conversation is too large.' }, { status: 413, headers })
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json({ error: 'The assistant is not configured yet.' }, { status: 503, headers })
  }

  try {
    const body = await readJsonBody(request, MAX_REQUEST_BYTES) as { messages?: unknown }
    const messages = await validateUIMessages<UIMessage>({ messages: body?.messages })
    const validationError = validateChatConversation(messages)

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400, headers })
    }

    const result = streamText({
      model: google(GEMINI_PRIMARY_MODEL),
      system: CHAT_INSTRUCTIONS,
      messages: await convertToModelMessages(messages),
      maxOutputTokens: 280,
      maxRetries: 0,
      timeout: { totalMs: 24_000, chunkMs: 10_000 },
      providerOptions: {
        google: {
          thinkingConfig: { thinkingLevel: 'minimal', includeThoughts: false },
          safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
          ],
        } satisfies GoogleLanguageModelOptions,
      },
    })

    return result.toUIMessageStreamResponse({
      headers,
      onError: (error) => {
        console.error('Luxe Bites assistant stream failed after retries.', error)
        return 'The assistant is temporarily unavailable. Please try again shortly.'
      },
    })
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { error: 'The conversation is too large.' },
        { status: 413, headers },
      )
    }

    console.error('Luxe Bites assistant request failed.', error)
    return NextResponse.json(
      { error: 'The assistant could not process that conversation.' },
      { status: 400, headers },
    )
  }
}
