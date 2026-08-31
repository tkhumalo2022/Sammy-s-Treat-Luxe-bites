# Sam's Luxe Bites

A production web application for a small dessert business, built around a visual ordering workflow rather than a generic storefront template.

Live site: https://sammy-s-treat-luxe-bites.vercel.app

## Overview

The site lets customers browse dessert options, build an itemised order request, review an estimated total and send the request for final confirmation. The business keeps control of availability, final pricing and payment confirmation instead of treating a browser submission as a completed sale.

The project also includes an authenticated content-management layer, structured order handling, transactional email support and a constrained customer assistant.

## Technology

- Next.js 16
- React 19
- TypeScript
- Payload CMS 3
- PostgreSQL
- Supabase
- Resend
- Vercel AI SDK with Google Gemini
- Sharp
- ESLint and automated tests

## Customer experience

- Visual product menu with prices and images
- Itemised quantity-based order builder
- Collection and delivery options
- Estimated subtotal, delivery fee and total before submission
- Gallery and product video content
- WhatsApp handoff for direct confirmation
- Accessible navigation and semantic page structure
- Structured business and FAQ metadata for search engines

## Order workflow

Order requests are handled by a server-side Next.js route.

The endpoint:

1. Applies request-size and rate limits.
2. Rejects cross-origin requests.
3. Validates submitted order data.
4. Uses a honeypot field to reduce automated spam.
5. Creates a deterministic order reference.
6. Stores accepted requests through a server-side Supabase RPC.
7. Sends an optional Resend notification with an idempotency key.
8. Returns a WhatsApp fallback if storage is temporarily unavailable.

Payment details are not collected by the website form. The business confirms the order separately before payment.

## Content and administration

Payload CMS provides the administration model for:

- Staff users with administrator and manager roles
- Product records
- Media uploads
- Order records and fulfilment status
- Site settings such as minimum order, delivery fee and deposit percentage

The Payload configuration uses PostgreSQL and separates public read access from staff-only create, update and delete operations.

## Customer assistant

The site includes a small business assistant using the Vercel AI SDK and Google Gemini. It is deliberately constrained to the business context rather than being presented as a general chatbot.

The server route includes:

- Same-origin request checks
- Conversation validation
- Request-size limits
- Rate limiting
- Output limits
- Provider safety settings
- Retry handling with a lighter fallback model for temporary provider failures

The assistant does not guess live availability, ingredients or allergen information; customers are directed to the business for details that require confirmation.

## Local development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Run project checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Use `.env.example` as the reference for local environment variables. Real database, CMS, email and model-provider credentials must remain outside the repository.

## Status

Active production project.
