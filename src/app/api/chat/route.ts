import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'

const MENU = `Black forest dessert R20; Oreo or chocolate mousse R25; cheesecake R25; red velvet pudding R20; peppermint crisp R25; Lotus Biscoff R30; malva pudding R20.`

function fallbackAnswer(message: string) {
  const text = message.toLowerCase()
  if (text.includes('menu') || text.includes('price') || text.includes('flavour')) return `Our current menu is: ${MENU}`
  if (text.includes('minimum')) return 'The minimum order is 10 desserts.'
  if (text.includes('deposit') || text.includes('payment')) return 'A 50% deposit is required to confirm an order. Sam will provide payment details.'
  if (text.includes('deliver')) return 'Delivery is available for R100, or you can choose collection.'
  if (text.includes('order')) return 'Tell me the flavours, quantities, date, and whether you need delivery or collection. You can then submit the order form or continue on WhatsApp.'
  return 'I can help with the menu, prices, minimum order, deposits, delivery, and placing an order.'
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 600) : ''
    if (!message) return NextResponse.json({ error: 'A message is required.' }, { status: 400 })

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ answer: fallbackAnswer(message), mode: 'guided' })
    }

    const result = await generateText({
      model: openai('gpt-4.1-mini'),
      system: `You are the customer assistant for Sammy’s Sweets | Luxe Bites. Be warm, concise, and honest. Use only these confirmed details: ${MENU} Minimum order: 10 desserts. Deposit: 50%. Delivery: R100. Never invent availability, dates, payment details, or discounts. Encourage the customer to submit an order request or contact Sam when confirmation is required.`,
      prompt: message,
      maxOutputTokens: 180,
      temperature: 0.3,
    })

    return NextResponse.json({ answer: result.text, mode: 'ai' })
  } catch {
    return NextResponse.json({ error: 'Chat is temporarily unavailable.' }, { status: 500 })
  }
}
