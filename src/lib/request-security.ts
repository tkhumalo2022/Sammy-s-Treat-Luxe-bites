export function getClientKey(request: Request, namespace: string) {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'anonymous'

  return `${namespace}:${ip}`
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')

  if (!origin) return true
  if (!host) return false

  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
