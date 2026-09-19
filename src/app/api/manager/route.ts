import { NextRequest, NextResponse } from 'next/server'

import { createMemoryRateLimiter } from '@/lib/rate-limit'
import { readJsonBody, RequestBodyTooLargeError } from '@/lib/request-body'
import { getClientKey, isSameOriginRequest } from '@/lib/request-security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 15

const MAX_REQUEST_BYTES = 16_000
const SESSION_COOKIE = '__Host-luxe_manager_session'
const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://bpynafeivwkvhtgxmnfz.supabase.co').trim()
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY?.trim() || ''

const loginLimit = createMemoryRateLimiter({ limit: 8, windowMs: 15 * 60 * 1_000 })
const activationLimit = createMemoryRateLimiter({ limit: 5, windowMs: 15 * 60 * 1_000 })
const mutationLimit = createMemoryRateLimiter({ limit: 30, windowMs: 5 * 60 * 1_000 })

type SessionResult = {
  sessionToken?: string
  expiresAt?: string
}

type JsonRecord = Record<string, unknown>

function noStoreHeaders(extra: Record<string, string> = {}) {
  return {
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...extra,
  }
}

function sessionToken(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value || ''
  return /^[a-f0-9]{64}$/i.test(token) ? token : ''
}

function clearSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
}

function setSession(response: NextResponse, token: string, expiresAt?: string) {
  const expires = expiresAt && Number.isFinite(Date.parse(expiresAt))
    ? new Date(expiresAt)
    : new Date(Date.now() + 12 * 60 * 60 * 1_000)

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    expires,
  })
}

class RpcError extends Error {
  constructor(readonly status: number) {
    super('Supabase RPC failed')
  }
}

async function rpc<T>(name: string, payload: JsonRecord): Promise<T> {
  if (!SUPABASE_SECRET_KEY) throw new RpcError(503)

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) throw new RpcError(response.status)
  return await response.json() as T
}

async function bodyOf(request: Request): Promise<JsonRecord> {
  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) throw new RpcError(415)

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_REQUEST_BYTES) throw new RequestBodyTooLargeError()

  const body = await readJsonBody(request, MAX_REQUEST_BYTES)
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new SyntaxError('Invalid JSON')
  return body as JsonRecord
}

function rateLimited(result: ReturnType<typeof loginLimit>) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: noStoreHeaders({
        'Retry-After': String(result.retryAfterSeconds),
        'X-RateLimit-Remaining': String(result.remaining),
      }),
    },
  )
}

async function dashboard(token: string) {
  return await rpc<JsonRecord>('get_luxe_bites_dashboard', { p_session_token: token })
}

export async function GET(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Cross-origin requests are not allowed.' }, { status: 403, headers: noStoreHeaders() })
  }

  const token = sessionToken(request)
  if (!token) {
    const response = NextResponse.json({ error: 'No active manager session.' }, { status: 401, headers: noStoreHeaders() })
    clearSession(response)
    return response
  }

  try {
    return NextResponse.json(await dashboard(token), { headers: noStoreHeaders() })
  } catch {
    const response = NextResponse.json({ error: 'Your manager session has expired.' }, { status: 401, headers: noStoreHeaders() })
    clearSession(response)
    return response
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Cross-origin requests are not allowed.' }, { status: 403, headers: noStoreHeaders() })
  }

  try {
    const body = await bodyOf(request)
    const action = String(body.action || '').trim().toLowerCase()
    const limiter = action === 'activate' ? activationLimit : loginLimit
    const limit = limiter(getClientKey(request, `manager-${action || 'auth'}`))
    if (!limit.allowed) return rateLimited(limit)

    let result: SessionResult
    if (action === 'login') {
      const email = String(body.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      if (!email || email.length > 160 || !password || password.length > 128) {
        return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401, headers: noStoreHeaders() })
      }
      result = await rpc<SessionResult>('login_luxe_bites_manager', {
        p_email: email,
        p_password: password,
      })
    } else if (action === 'activate') {
      const inviteToken = String(body.inviteToken || '').trim()
      const password = String(body.password || '')
      if (inviteToken.length < 40 || inviteToken.length > 512 || password.length < 10 || password.length > 128) {
        return NextResponse.json({ error: 'This invitation could not be activated.' }, { status: 400, headers: noStoreHeaders() })
      }
      result = await rpc<SessionResult>('activate_luxe_bites_manager', {
        p_invite_token: inviteToken,
        p_password: password,
      })
    } else {
      return NextResponse.json({ error: 'Unsupported manager action.' }, { status: 400, headers: noStoreHeaders() })
    }

    const token = String(result.sessionToken || '')
    if (!/^[a-f0-9]{64}$/i.test(token)) throw new RpcError(502)

    const data = await dashboard(token)
    const response = NextResponse.json({ dashboard: data }, { headers: noStoreHeaders() })
    setSession(response, token, result.expiresAt)
    return response
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: 'The request is too large.' }, { status: 413, headers: noStoreHeaders() })
    }
    if (error instanceof RpcError && error.status === 503) {
      return NextResponse.json({ error: 'Manager authentication is temporarily unavailable.' }, { status: 503, headers: noStoreHeaders() })
    }
    return NextResponse.json({ error: 'Invalid email, password or invitation.' }, { status: 401, headers: noStoreHeaders() })
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Cross-origin requests are not allowed.' }, { status: 403, headers: noStoreHeaders() })
  }

  const token = sessionToken(request)
  if (!token) return NextResponse.json({ error: 'Sign in again before making changes.' }, { status: 401, headers: noStoreHeaders() })

  const limit = mutationLimit(getClientKey(request, 'manager-mutation'))
  if (!limit.allowed) return rateLimited(limit)

  try {
    const body = await bodyOf(request)
    const action = String(body.action || '').trim().toLowerCase()

    if (action === 'update-order') {
      await rpc('update_luxe_bites_order_management', {
        p_session_token: token,
        p_order_id: String(body.orderId || ''),
        p_status: String(body.status || ''),
        p_payment_status: String(body.paymentStatus || ''),
        p_confirmed_total: body.confirmedTotal ?? null,
        p_customer_contacted: Boolean(body.customerContacted),
        p_internal_notes: String(body.internalNotes || ''),
      })
    } else if (action === 'update-product') {
      await rpc('update_luxe_bites_product', {
        p_session_token: token,
        p_product_id: String(body.productId || ''),
        p_name: String(body.name || ''),
        p_description: String(body.description || ''),
        p_price: Number(body.price),
        p_available: Boolean(body.available),
        p_featured: Boolean(body.featured),
        p_sort_order: Number(body.sortOrder),
      })
    } else if (action === 'update-settings') {
      await rpc('update_luxe_bites_settings', {
        p_session_token: token,
        p_business_name: String(body.businessName || ''),
        p_tagline: String(body.tagline || ''),
        p_whatsapp_number: String(body.whatsappNumber || ''),
        p_minimum_order: Number(body.minimumOrder),
        p_deposit_percentage: Number(body.depositPercentage),
        p_delivery_fee: Number(body.deliveryFee),
        p_chatbot_enabled: Boolean(body.chatbotEnabled),
      })
    } else {
      return NextResponse.json({ error: 'Unsupported manager action.' }, { status: 400, headers: noStoreHeaders() })
    }

    return NextResponse.json({ success: true }, { headers: noStoreHeaders() })
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: 'The request is too large.' }, { status: 413, headers: noStoreHeaders() })
    }
    const status = error instanceof RpcError && error.status === 401 ? 401 : 400
    const response = NextResponse.json(
      { error: status === 401 ? 'Your manager session has expired.' : 'The change could not be saved.' },
      { status, headers: noStoreHeaders() },
    )
    if (status === 401) clearSession(response)
    return response
  }
}

export async function DELETE(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Cross-origin requests are not allowed.' }, { status: 403, headers: noStoreHeaders() })
  }

  const token = sessionToken(request)
  if (token && SUPABASE_SECRET_KEY) {
    await rpc('logout_luxe_bites_manager', { p_session_token: token }).catch(() => undefined)
  }

  const response = NextResponse.json({ success: true }, { headers: noStoreHeaders() })
  clearSession(response)
  return response
}
