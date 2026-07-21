import { BUSINESS_DETAILS } from './business.ts'

export type OrderRequest = {
  name: string
  phone: string
  email: string
  order: string
  fulfilment: 'delivery' | 'collection'
  address: string
  eventDate: string
  notes: string
}

export type OrderValidationResult =
  | { data: OrderRequest; errors: null }
  | { data: null; errors: Record<string, string> }

function stringValue(input: Record<string, unknown>, field: string) {
  return typeof input[field] === 'string' ? input[field].trim() : ''
}

export function validateOrderRequest(input: unknown): OrderValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { data: null, errors: { form: 'Please complete the order form.' } }
  }

  const values = input as Record<string, unknown>
  const data: OrderRequest = {
    name: stringValue(values, 'name'),
    phone: stringValue(values, 'phone'),
    email: stringValue(values, 'email'),
    order: stringValue(values, 'order'),
    fulfilment: stringValue(values, 'fulfilment') as OrderRequest['fulfilment'],
    address: stringValue(values, 'address'),
    eventDate: stringValue(values, 'eventDate'),
    notes: stringValue(values, 'notes'),
  }
  const errors: Record<string, string> = {}

  if (data.name.length < 2 || data.name.length > 80) {
    errors.name = 'Enter your name using 2–80 characters.'
  }

  const phoneDigits = data.phone.replace(/\D/g, '')
  if (!/^[+\d().\s-]+$/.test(data.phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
    errors.phone = 'Enter a valid phone number.'
  }

  if (data.email && (data.email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))) {
    errors.email = 'Enter a valid email address or leave it blank.'
  }

  if (data.order.length < 10 || data.order.length > 1_000) {
    errors.order = 'Describe the flavours and quantities using 10–1,000 characters.'
  }

  if (data.fulfilment !== 'delivery' && data.fulfilment !== 'collection') {
    errors.fulfilment = 'Choose delivery or collection.'
  }

  if (data.address.length > 300 || (data.fulfilment === 'delivery' && data.address.length < 5)) {
    errors.address = 'Enter the delivery address using 5–300 characters.'
  }

  if (data.eventDate) {
    const parsedDate = new Date(`${data.eventDate}T00:00:00.000Z`)
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(data.eventDate)
      || Number.isNaN(parsedDate.getTime())
      || parsedDate.toISOString().slice(0, 10) !== data.eventDate
    ) {
      errors.eventDate = 'Choose a valid event date.'
    }
  }

  if (data.notes.length > 600) {
    errors.notes = 'Keep additional notes under 600 characters.'
  }

  if (values.acceptedTerms !== true) {
    errors.acceptedTerms = 'Confirm that Sam still needs to approve the request.'
  }

  return Object.keys(errors).length
    ? { data: null, errors }
    : { data, errors: null }
}

export function buildWhatsAppOrderUrl(order: OrderRequest, reference?: string) {
  const lines = [
    'Hi Sam, I would like to request a Luxe Bites order.',
    reference ? `Reference: ${reference}` : '',
    `Name: ${order.name}`,
    `Phone: ${order.phone}`,
    order.email ? `Email: ${order.email}` : '',
    `Order: ${order.order}`,
    `Fulfilment: ${order.fulfilment === 'delivery' ? `Delivery (R${BUSINESS_DETAILS.deliveryFee})` : 'Collection'}`,
    order.address ? `Address: ${order.address}` : '',
    order.eventDate ? `Event date: ${order.eventDate}` : '',
    order.notes ? `Notes: ${order.notes}` : '',
    '',
    'I understand availability, total price, payment details, and final confirmation still need to be confirmed.',
  ].filter(Boolean)

  return `https://wa.me/${BUSINESS_DETAILS.whatsappNumber}?text=${encodeURIComponent(lines.join('\n'))}`
}
