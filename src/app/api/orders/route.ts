import { createHash } from 'node:crypto'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

import { buildWhatsAppOrderUrl, validateOrderRequest, type OrderRequest } from '@/lib/order'
import { createMemoryRateLimiter } from '@/lib/rate-limit'
import { readJsonBody, RequestBodyTooLargeError } from '@/lib/request-body'
import { getClientKey, isSameOriginRequest } from '@/lib/request-security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 15

const MAX_REQUEST_BYTES = 12_000
const SUPABASE_URL = 'https://bpynafeivwkvhtgxmnfz.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_jnLojIpNv0Gqcfu_zfoz1w_WvC9mYXX'
const consumeOrderLimit = createMemoryRateLimiter({
  limit: 5,
  windowMs: 15 * 60 * 1_000,
})

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] || character)
}

function orderEmail(order: OrderRequest, reference: string) {
  const row = (label: string, value: string) => value
    ? `<tr><th style="padding:8px 12px;text-align:left;vertical-align:top;color:#6d2c99">${label}</th><td style="padding:8px 12px;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`
    : ''

  return `<!doctype html>
<html><body style="margin:0;background:#f7f2f8;color:#211527;font-family:Arial,sans-serif">
  <div style="max-width:680px;margin:0 auto;padding:32px 18px">
    <div style="border-radius:20px;background:#ffffff;padding:28px;box-shadow:0 12px 40px rgba(50,20,60,.08)">
      <p style="margin:0 0 8px;color:#8b4bb5;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Luxe Bites order request</p>
      <h1 style="margin:0 0 20px;font-size:24px">New request ${reference}</h1>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${row('Name', order.name)}
        ${row('Phone', order.phone)}
        ${row('Email', order.email)}
        ${row('Order', order.order)}
        ${row('Fulfilment', order.fulfilment)}
        ${row('Address', order.address)}
        ${row('Event date', order.eventDate)}
        ${row('Notes', order.notes)}
      </table>
      <p style="margin:22px 0 0;color:#6c606f;font-size:12px">This request has been saved in the Luxe Bites CMS. Confirm availability, total price, payment details, and fulfilment directly with the customer.</p>
    </div>
  </div>
</body></html>`
}

function responseHeaders(remaining: number) {
  return {
    'Cache-Control': 'no-store',
    'X-RateLimit-Limit': '5',
    'X-RateLimit-Remaining': String(remaining),
  }
}

async function saveOrder(order: OrderRequest, reference: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_luxe_bites_order`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_reference: reference,
      p_customer_name: order.name,
      p_phone: order.phone,
      p_email: order.email || null,
      p_order_details: order.order,
      p_fulfilment: order.fulfilment,
      p_address: order.address || null,
      p_event_date: order.eventDate || null,
      p_notes: order.notes || null,
      p_source: 'website',
    }),
  })

  if (!response.ok) {
    throw new Error(`Supabase order storage failed with status ${response.status}`)
  }

  const result = await response.json() as { stored?: boolean }
  if (!result.stored) throw new Error('Supabase did not confirm order storage')
}

export async function POST(request: Request) {
  const rateLimit = consumeOrderLimit(getClientKey(request, 'order'))
  const headers = responseHeaders(rateLimit.remaining)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please use WhatsApp or try again later.' },
      { status: 429, headers: { ...headers, 'Retry-After': String(rateLimit.retryAfterSeconds) } },
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
    return NextResponse.json({ error: 'The order request is too large.' }, { status: 413, headers })
  }

  try {
    const body = await readJsonBody(request, MAX_REQUEST_BYTES)
    const input = body && typeof body === 'object' && !Array.isArray(body)
      ? body as Record<string, unknown>
      : {}

    if (typeof input.website === 'string' && input.website.trim()) {
      return NextResponse.json({ status: 'sent' }, { headers })
    }

    const validation = validateOrderRequest(input)
    if (validation.errors) {
      return NextResponse.json(
        { error: 'Please check the highlighted order details.', fields: validation.errors },
        { status: 400, headers },
      )
    }

    const fingerprint = createHash('sha256')
      .update(JSON.stringify(validation.data))
      .digest('hex')
    const reference = `LB-${fingerprint.slice(0, 10).toUpperCase()}`
    const whatsappUrl = buildWhatsAppOrderUrl(validation.data, reference)

    try {
      await saveOrder(validation.data, reference)
    } catch (error) {
      console.error('Order storage failed', {
        name: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error ? error.message : 'Unknown failure',
      })
      return NextResponse.json({ status: 'fallback', reference, whatsappUrl }, { headers })
    }

    const notificationEmail = process.env.ORDER_NOTIFICATION_EMAIL?.trim()
    if (process.env.RESEND_API_KEY && notificationEmail) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const { error } = await resend.emails.send(
        {
          from: process.env.ORDER_FROM_EMAIL?.trim() || 'Luxe Bites Orders <onboarding@resend.dev>',
          to: notificationEmail,
          replyTo: validation.data.email || undefined,
          subject: `New Luxe Bites order request ${reference}`,
          html: orderEmail(validation.data, reference),
        },
        { idempotencyKey: `luxe-order-${fingerprint}` },
      )

      if (error) console.error('Order notification failed', { code: error.name })
    }

    return NextResponse.json({ status: 'sent', stored: true, reference, whatsappUrl }, { headers })
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: 'The order request is too large.' }, { status: 413, headers })
    }

    return NextResponse.json({ error: 'The request could not be processed.' }, { status: 400, headers })
  }
}
