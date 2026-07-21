'use client'

import Image from 'next/image'
import { type FormEvent, useMemo, useState } from 'react'

import { BUSINESS_DETAILS, MENU_ITEMS } from '@/lib/business'
import { buildWhatsAppOrderUrl, type OrderRequest } from '@/lib/order'

import styles from './order-form-v2.module.css'

type SubmitState = 'idle' | 'sending' | 'sent' | 'fallback' | 'error'
type MenuName = (typeof MENU_ITEMS)[number]['name']
type Quantities = Record<MenuName, number>

type OrderResponse = {
  status?: 'sent' | 'fallback'
  reference?: string
  whatsappUrl?: string
  error?: string
}

function createEmptyQuantities() {
  return Object.fromEntries(MENU_ITEMS.map((item) => [item.name, 0])) as Quantities
}

export function OrderForm() {
  const [state, setState] = useState<SubmitState>('idle')
  const [fulfilment, setFulfilment] = useState<OrderRequest['fulfilment']>('delivery')
  const [quantities, setQuantities] = useState<Quantities>(createEmptyQuantities)
  const [message, setMessage] = useState('')
  const [whatsappUrl, setWhatsappUrl] = useState(`https://wa.me/${BUSINESS_DETAILS.whatsappNumber}`)

  const selectedItems = useMemo(
    () => MENU_ITEMS
      .map((item) => ({ ...item, quantity: quantities[item.name] }))
      .filter((item) => item.quantity > 0),
    [quantities],
  )

  const totalQuantity = selectedItems.reduce((total, item) => total + item.quantity, 0)
  const subtotal = selectedItems.reduce((total, item) => total + item.quantity * item.price, 0)
  const deliveryCharge = fulfilment === 'delivery' && totalQuantity > 0 ? BUSINESS_DETAILS.deliveryFee : 0
  const estimatedTotal = subtotal + deliveryCharge
  const meetsMinimum = totalQuantity >= BUSINESS_DETAILS.minimumOrder

  function clearFeedback() {
    if (state !== 'sending' && state !== 'idle') {
      setState('idle')
      setMessage('')
    }
  }

  function setQuantity(name: MenuName, nextQuantity: number) {
    clearFeedback()
    const quantity = Number.isFinite(nextQuantity)
      ? Math.max(0, Math.min(999, Math.floor(nextQuantity)))
      : 0
    setQuantities((current) => ({ ...current, [name]: quantity }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state === 'sending') return

    if (!meetsMinimum) {
      setState('error')
      setMessage(`Please choose at least ${BUSINESS_DETAILS.minimumOrder} desserts. You currently have ${totalQuantity}.`)
      document.getElementById('dessert-selector')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    const form = event.currentTarget
    const data = new FormData(form)

    if (data.get('website')) return

    setState('sending')
    setMessage('')

    const lineItems = selectedItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      lineTotal: item.quantity * item.price,
    }))
    const itemisedOrder = lineItems
      .map((item) => `${item.quantity} × ${item.name} @ R${item.unitPrice} = R${item.lineTotal}`)
      .join('\n')

    const order: OrderRequest = {
      name: String(data.get('name') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      email: String(data.get('email') || '').trim(),
      order: `${itemisedOrder}\nDessert subtotal: R${subtotal}\nDelivery: R${deliveryCharge}\nEstimated total: R${estimatedTotal}`,
      lineItems,
      itemCount: totalQuantity,
      subtotal,
      deliveryFee: deliveryCharge,
      estimatedTotal,
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
          name: order.name,
          phone: order.phone,
          email: order.email,
          items: lineItems.map(({ name, quantity }) => ({ name, quantity })),
          fulfilment: order.fulfilment,
          address: order.address,
          eventDate: order.eventDate,
          notes: order.notes,
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
        setQuantities(createEmptyQuantities())
        setState('sent')
        setMessage(`Request ${result.reference || ''} saved securely. Sam can see every item, total and fulfilment detail in her dashboard.`)
      } else {
        setState('fallback')
        setMessage('Your itemised request is ready. Send it to Sam on WhatsApp to finish checkout.')
      }
    } catch (error) {
      setState('error')
      const reason = error instanceof Error && error.message !== 'Order request failed'
        ? error.message
        : 'The online request could not be sent.'
      setMessage(`${reason} Your itemised order is ready for WhatsApp instead.`)
    }
  }

  return (
    <form className="order-form" onSubmit={handleSubmit} onChange={clearFeedback}>
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <section className={styles.step} id="dessert-selector">
        <div className={styles.stepHeading}>
          <div>
            <span className={styles.stepNumber}>Step 1</span>
            <h3>Choose desserts and quantities</h3>
            <p>Mix flavours freely. The minimum total is {BUSINESS_DETAILS.minimumOrder} desserts.</p>
          </div>
          <span className={styles.countBadge}>{totalQuantity} selected</span>
        </div>

        <div className={styles.productGrid}>
          {MENU_ITEMS.map((item) => (
            <article className={styles.productCard} key={item.name}>
              <div className={styles.productImage}>
                <Image src={item.image} alt={`${item.name} by Luxe Bites`} fill sizes="(max-width: 680px) 110px, 220px" />
              </div>
              <div className={styles.productBody}>
                <div className={styles.productName}>
                  <strong>{item.name}</strong>
                  <strong>R{item.price}</strong>
                </div>
                <div className={styles.quantity}>
                  <button type="button" aria-label={`Remove one ${item.name}`} onClick={() => setQuantity(item.name, quantities[item.name] - 1)}>−</button>
                  <input type="number" min="0" max="999" inputMode="numeric" aria-label={`${item.name} quantity`} value={quantities[item.name]} onChange={(event) => setQuantity(item.name, Number(event.target.value))} />
                  <button type="button" aria-label={`Add one ${item.name}`} onClick={() => setQuantity(item.name, quantities[item.name] + 1)}>+</button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {!meetsMinimum && totalQuantity > 0 && (
          <p className={styles.minimumError}>Add {BUSINESS_DETAILS.minimumOrder - totalQuantity} more dessert{BUSINESS_DETAILS.minimumOrder - totalQuantity === 1 ? '' : 's'} to reach the minimum.</p>
        )}
      </section>

      <section className={styles.step}>
        <div className={styles.stepHeading}>
          <div>
            <span className={styles.stepNumber}>Step 2</span>
            <h3>Review your order</h3>
            <p>Prices below are an estimate until Sam confirms availability and the final total.</p>
          </div>
        </div>

        <div className={styles.summary} aria-live="polite">
          {selectedItems.length === 0 ? (
            <p className={styles.emptySummary}>Your selected desserts will appear here.</p>
          ) : (
            <ul className={styles.summaryList}>
              {selectedItems.map((item) => (
                <li key={item.name}><span>{item.quantity} × {item.name}</span><strong>R{item.quantity * item.price}</strong></li>
              ))}
            </ul>
          )}

          <div className={styles.totalBlock}>
            <div className={styles.totalRow}><span>Dessert subtotal</span><strong>R{subtotal}</strong></div>
            <div className={styles.totalRow}><span>{fulfilment === 'delivery' ? 'Delivery estimate' : 'Collection'}</span><strong>{fulfilment === 'delivery' ? `R${deliveryCharge}` : 'R0'}</strong></div>
            <div className={styles.totalRow}><span>Current estimate</span><strong>R{estimatedTotal}</strong></div>
          </div>
          <p className={styles.estimateNote}>Sam confirms the final price, availability and payment details before the order is booked.</p>
        </div>

        <div className={styles.checkoutInfo}>
          <h4>How checkout and payment work</h4>
          <ol>
            <li>Send this itemised order request.</li>
            <li>Sam checks availability and confirms the final amount.</li>
            <li>Sam sends verified payment details for the <strong>{BUSINESS_DETAILS.depositPercentage}% deposit</strong>.</li>
          </ol>
        </div>
      </section>

      <section className={styles.step}>
        <div className={styles.stepHeading}>
          <div>
            <span className={styles.stepNumber}>Step 3</span>
            <h3>Your details</h3>
            <p>These details help Sam contact you and prepare the order.</p>
          </div>
        </div>

        <div className="form-row">
          <label><span>Your name</span><input name="name" autoComplete="name" required minLength={2} maxLength={80} /></label>
          <label><span>Phone number</span><input name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={30} /></label>
        </div>

        <label><span>Email address <small>(optional)</small></span><input name="email" type="email" inputMode="email" autoComplete="email" maxLength={160} /></label>

        <div className="form-row">
          <label>
            <span>Delivery or collection</span>
            <select name="fulfilment" value={fulfilment} onChange={(event) => setFulfilment(event.target.value as OrderRequest['fulfilment'])}>
              <option value="delivery">Delivery (R{BUSINESS_DETAILS.deliveryFee})</option>
              <option value="collection">Collection</option>
            </select>
          </label>
          <label><span>Event date <small>(optional)</small></span><input name="eventDate" type="date" /></label>
        </div>

        {fulfilment === 'delivery' && (
          <label><span>Delivery address</span><textarea name="address" rows={2} required minLength={5} maxLength={300} autoComplete="street-address" /></label>
        )}

        <label><span>Extra notes <small>(optional)</small></span><textarea name="notes" rows={3} maxLength={600} placeholder="Event details, preferred collection time, or anything Sam should know" /></label>
      </section>

      <label className="form-consent">
        <input name="acceptedTerms" type="checkbox" required />
        <span>I understand this is a request. Sam must still confirm availability, the final price, payment details, and fulfilment.</span>
      </label>

      <button type="submit" disabled={state === 'sending' || !meetsMinimum}>
        {state === 'sending' ? 'Saving itemised order…' : meetsMinimum ? 'Continue to confirmation' : `Choose ${BUSINESS_DETAILS.minimumOrder} desserts to continue`}
      </button>

      <div className={`form-status ${state}`} role="status" aria-live="polite">
        {message}
        {(state === 'fallback' || state === 'error') && selectedItems.length > 0 && (
          <a href={whatsappUrl} target="_blank" rel="noreferrer">Send this itemised order on WhatsApp</a>
        )}
      </div>
      <p className="form-privacy">Never enter card, PIN or banking information here. Payment details must come directly from Sam after confirmation.</p>
    </form>
  )
}
