import assert from 'node:assert/strict'
import test from 'node:test'

import { buildWhatsAppOrderUrl, validateOrderRequest } from '../src/lib/order.ts'

const validDelivery = {
  name: 'Sam Customer',
  phone: '+27 82 555 0101',
  email: 'sam@example.com',
  items: [{ name: 'Black forest dessert', quantity: 10 }],
  fulfilment: 'delivery',
  address: '10 Example Street, Johannesburg',
  eventDate: '2026-08-12',
  notes: 'Birthday event',
  acceptedTerms: true,
}

test('accepts a complete delivery request and trims input', () => {
  const result = validateOrderRequest({ ...validDelivery, name: '  Sam Customer  ' })

  assert.equal(result.errors, null)
  assert.equal(result.data?.name, 'Sam Customer')
  assert.equal(result.data?.fulfilment, 'delivery')
  assert.equal(result.data?.itemCount, 10)
  assert.equal(result.data?.subtotal, 200)
})

test('accepts collection without an address', () => {
  const result = validateOrderRequest({
    ...validDelivery,
    fulfilment: 'collection',
    address: '',
  })

  assert.equal(result.errors, null)
  assert.equal(result.data?.deliveryFee, 0)
})

test('rejects malformed contact, fulfilment, date, and consent fields', () => {
  const result = validateOrderRequest({
    ...validDelivery,
    phone: 'abc',
    email: 'not-an-email',
    fulfilment: 'courier',
    eventDate: '2026-02-31',
    acceptedTerms: false,
  })

  assert.ok(result.errors?.phone)
  assert.ok(result.errors?.email)
  assert.ok(result.errors?.fulfilment)
  assert.ok(result.errors?.eventDate)
  assert.ok(result.errors?.acceptedTerms)
})

test('rejects an order below the minimum quantity', () => {
  const result = validateOrderRequest({
    ...validDelivery,
    items: [{ name: 'Black forest dessert', quantity: 9 }],
  })

  assert.ok(result.errors?.items)
})

test('recalculates prices instead of trusting client totals', () => {
  const result = validateOrderRequest({
    ...validDelivery,
    items: [{ name: 'Lotus Biscoff', quantity: 10, unitPrice: 1, lineTotal: 10 }],
  })

  assert.equal(result.errors, null)
  assert.equal(result.data?.subtotal, 300)
  assert.equal(result.data?.estimatedTotal, 400)
})

test('builds an encoded WhatsApp handoff without changing the order', () => {
  const result = validateOrderRequest(validDelivery)
  assert.ok(result.data)

  const url = buildWhatsAppOrderUrl(result.data, 'LB-1234567890')

  assert.match(url, /^https:\/\/wa\.me\/27832656484\?text=/)
  assert.match(decodeURIComponent(url), /Reference: LB-1234567890/)
  assert.match(decodeURIComponent(url), /10 × Black forest dessert/)
})
