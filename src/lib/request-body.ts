export class RequestBodyTooLargeError extends Error {
  constructor() {
    super('Request body is too large.')
    this.name = 'RequestBodyTooLargeError'
  }
}

export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  if (!request.body) throw new SyntaxError('Request body is required.')

  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let body = ''
  let bytesRead = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    bytesRead += value.byteLength
    if (bytesRead > maxBytes) {
      await reader.cancel()
      throw new RequestBodyTooLargeError()
    }

    body += decoder.decode(value, { stream: true })
  }

  body += decoder.decode()
  return JSON.parse(body)
}
