'use client'

import { type FormEvent, useState } from 'react'

import { BUSINESS_DETAILS } from '@/lib/business'
import { buildWhatsAppOrderUrl, type OrderRequest } from '@/lib/order'

type SubmitState = 'idle' | 'sending' | 'sent' | 'fallback' | 'error'

type OrderResponse = {
  status?: 'sent' | 'fallback'
  reference?: string
  whatsappUrl?: string
  error?: string
}

export function OrderForm() {
  const [state, setState] = useState<SubmitState>('idle')
  const [fulfilment, setFulfilment] = useState<OrderRequest['fulfilment']>('delivery')
  const [message, setMessage] = useState('')
  const [whatsappUrl, setWhatsappUrl] = useState(`https://wa.me/${BUSINESS_DETAILS.whatsappNumber}`)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state === 'sending') return

    const form = event.currentTarget
    const data = new FormData(form)

    if (data.get('website')) return

    setState('sending')
    setMessage('')

    const order: OrderRequest = {
      name: String(data.get('name') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      email: String(data.get('email') || '').trim(),
      order: String(data.get('order') || '').trim(),
      fulfilment,
      address: String(data.get('address') || '').trim(),
      eventDate: String(data.get('eventDate') || '').trim(),
      notes: String(data.get('notes') || '').trim(),
    }
    const fallbackUrl = buildWhatsAppOrderUrl(order)
    setWhatsappUrl(fallbackUrl)

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...order,
          website: String(data.get('website') || ''),
          acceptedTerms: data.get('acceptedTerms') === 'on',
        }),
      })
      const result = await response.json() as OrderResponse

      if (!response.ok) {
        throw new Error(result.error || 'Order request failed')
      }

      setWhatsappUrl(result.whatsappUrl || fallbackUrl)

      if (result.status === 'sent') {
        form.reset()
        setFulfilment('delivery')
        setState('sent')
        setMessage(`Request ${result.reference || ''} saved securely. Sam will confirm the details with you.`)
      } else {
        setState('fallback')
        setMessage('Your request is ready. Send it to Sam on WhatsApp to finish.')
      }
    } catch (error) {
      setState('error')
      const reason = error instanceof Error && error.message !== 'Order request failed'
        ? error.message
        : 'The online request could not be sent.'
      setMessage(`${reason} Your details are ready for WhatsApp instead.`)
    }
  }

  return (
    <form className="order-form" onSubmit={handleSubmit} onChange={() => {
      if (state !== 'sending' && state !== 'idle') {
        setState('idle')
        setMessage('')
      }
    }}>
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="form-row">
        <label>
          <span>Your name</span>
          <input name="name" autoComplete="name" required minLength={2} maxLength={80} />
        </label>

        <label>
          <span>Phone number</span>
          <input name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={30} />
        </label>
      </div>

      <label>
        <span>Email address <small>(optional)</small></span>
        <input name="email" type="email" inputMode="email" autoComplete="email" maxLength={160} />
      </label>

      <label>
        <span>Flavours and quantities</span>
        <textarea
          name="order"
          rows={4}
          required
          minLength={10}
          maxLength={1_000}
          placeholder={`Example: ${BUSINESS_DETAILS.minimumOrder} Black Forest dessert cups`}
        />
        <small>Minimum order: {BUSINESS_DETAILS.minimumOrder} desserts.</small>
      </label>

      <div className="form-row">
        <label>
          <span>Delivery or collection</span>
          <select
            name="fulfilment"
            value={fulfilment}
            onChange={(event) => setFulfilment(event.target.value as OrderRequest['fulfilment'])}
          >
            <option value="delivery">Delivery (R{BUSINESS_DETAILS.deliveryFee})</option>
            <option value="collection">Collection</option>
          </select>
        </label>

        <label>
          <span>Event date <small>(optional)</small></span>
          <input name="eventDate" type="date" />
        </label>
      </div>

      {fulfilment === 'delivery' && (
        <label>
          <span>Delivery address</span>
          <textarea name="address" rows={2} required minLength={5} maxLength={300} autoComplete="street-address" />
        </label>
      )}

      <label>
        <span>Extra notes <small>(optional)</small></span>
        <textarea name="notes" rows={3} maxLength={600} />
      </label>

      <label className="form-consent">
        <input name="acceptedTerms" type="checkbox" required />
        <span>I understand this is a request. Sam must still confirm availability, the final price, payment details, and fulfilment.</span>
      </label>

      <button type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending securely…' : 'Send order request'}
      </button>

      <div className={`form-status ${state}`} role="status" aria-live="polite">
        {message}
        {(state === 'fallback' || state === 'error') && (
          <a href={whatsappUrl} target="_blank" rel="noreferrer">
            Send this request on WhatsApp
          </a>
        )}
      </div>
      <p className="form-privacy">Do not enter card or banking information. Your details are used only to respond to this order request.</p>
    </form>
  )
}