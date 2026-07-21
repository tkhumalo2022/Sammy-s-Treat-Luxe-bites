import config from '@payload-config'
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from '@payloadcms/next/routes'

import { isPayloadConfigured } from '@/lib/payload-runtime'

const unavailable = () => Response.json(
  { error: 'The administration API is not configured.' },
  { status: 503, headers: { 'Cache-Control': 'no-store' } },
)

export const GET = isPayloadConfigured ? REST_GET(config) : unavailable
export const POST = isPayloadConfigured ? REST_POST(config) : unavailable
export const DELETE = isPayloadConfigured ? REST_DELETE(config) : unavailable
export const PATCH = isPayloadConfigured ? REST_PATCH(config) : unavailable
export const PUT = isPayloadConfigured ? REST_PUT(config) : unavailable
export const OPTIONS = isPayloadConfigured ? REST_OPTIONS(config) : unavailable
