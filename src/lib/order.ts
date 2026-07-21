import { BUSINESS_DETAILS, MENU_ITEMS } from './business.ts'

export type OrderLineItem = {
  name: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export type OrderRequest = {
  name: string
  phone: string
  email: string
  order: string
  lineItems: OrderLineItem[]
  itemCount: number
  subtotal: number
  deliveryFee: number
  estimatedTotal: number
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

function validateLineItems(values: Record<string, unknown>, errors: Record<string, string>) {
  const rawItems = Array.isArray(values.items) ? values.items : []
  const prices = new Map(MENU_ITEMS.map((item) => [item.name, item.price]))
  const quantities = new Map<string, number>()

  for (const rawItem of rawItems) {
    if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) continue
    const item = rawItem as Record<string, unknown>
    const name = typeof item.name === 'string' ? item.name.trim() : ''
    const quantity = typeof item.quantity === 'number' ? item.quantity : Number(item.quantity)

    if (!prices.has(name) || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      errors.items = 'Choose valid desserts and quantities.'
      continue
    }

    quantities.set(name, (quantities.get(name) || 0) + quantity)
  }

  const lineItems: OrderLineItem[] = MENU_ITEMS
    .filter((item) => quantities.has(item.name))
    .map((item) => {
      const quantity = quantities.get(item.name) || 0
      return {
        name: item.name,
        quantity,
        unitPrice: item.price,
        lineTotal: quantity * item.price,
      }
    })

  const itemCount = lineItems.reduce((total, item) => total + item.quantity, 0)
  if (itemCount < BUSINESS_DETAILS.minimumOrder) {
    errors.items = `Choose at least ${BUSINESS_DETAILS.minimumOrder} desserts.`
  }

  const subtotal = lineItems.reduce((total, item) => total + item.lineTotal, 0)
  return { lineItems, itemCount, subtotal }
}

export function validateOrderRequest(input: unknown): OrderValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { data: null, errors: { form: 'Please complete the order form.' } }
  }

  const values = input as Record<string, unknown>
  const errors: Record<string, string> = {}
  const fulfilment = stringValue(values, 'fulfilment') as OrderRequest['fulfilment']
  const { lineItems, itemCount, subtotal } = validateLineItems(values, errors)
  const deliveryFee = fulfilment === 'delivery' ? BUSINESS_DETAILS.deliveryFee : 0
  const estimatedTotal = subtotal + deliveryFee
  const order = [
    ...lineItems.map((item) => `${item.quantity} × ${item.name} @ R${item.unitPrice} = R${item.lineTotal}`),
    `Dessert subtotal: R${subtotal}`,
    `Delivery: R${deliveryFee}`,
    `Estimated total: R${estimatedTotal}`,
  ].join('\n')

  const data: OrderRequest = {
    name: stringValue(values, 'name'),
    phone: stringValue(values, 'phone'),
    email: stringValue(values, 'email'),
    order,
    lineItems,
    itemCount,
    subtotal,
    deliveryFee,
    estimatedTotal,
    fulfilment,
    address: stringValue(values, 'address'),
    eventDate: stringValue(values, 'eventDate'),
    notes: stringValue(values, 'notes'),
  }

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

  if (data.order.length < 10 || data.order.length > 2_000) {
    errors.order = 'The itemised order is too large.'
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
    '',
    'Items:',
    ...order.lineItems.map((item) => `• ${item.quantity} × ${item.name} — R${item.lineTotal}`),
    `Dessert subtotal: R${order.subtotal}`,
    `Delivery: R${order.deliveryFee}`,
    `Estimated total: R${order.estimatedTotal}`,
    `Fulfilment: ${order.fulfilment === 'delivery' ? 'Delivery' : 'Collection'}`,
    order.address ? `Address: ${order.address}` : '',
    order.eventDate ? `Event date: ${order.eventDate}` : '',
    order.notes ? `Notes: ${order.notes}` : '',
    '',
    'I understand availability, the final total, payment details, and confirmation still need to be confirmed.',
  ].filter(Boolean)

  return `https://wa.me/${BUSINESS_DETAILS.whatsappNumber}?text=${encodeURIComponent(lines.join('\n'))}`
}
