import { createHmac, timingSafeEqual } from 'crypto'

// sign a payload with a secret — used for outgoing deliveries
// produces a hex signature the destination can verify
export function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
}

// build the signature header value
// format: t=TIMESTAMP,v1=SIGNATURE
// timestamp included to prevent replay attacks
export function buildSignatureHeader(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signed = `${timestamp}.${payload}`
  const signature = signPayload(signed, secret)
  return `t=${timestamp},v1=${signature}`
}

// verify an incoming signature — Stripe-compatible format
// returns true if valid, false if tampered or wrong secret
export function verifySignature(
  payload: string,
  header: string,
  secret: string,
  toleranceSeconds = 300  // reject signatures older than 5 minutes
): boolean {
  try {
    // parse t=... and v1=... from header
    const parts = header.split(',')
    const tPart = parts.find(p => p.startsWith('t='))
    const vPart = parts.find(p => p.startsWith('v1='))

    if (!tPart || !vPart) return false

    const timestamp = tPart.slice(2)
    const receivedSig = vPart.slice(3)

    // check timestamp tolerance — prevents replay attacks
    const now = Math.floor(Date.now() / 1000)
    const age = now - parseInt(timestamp, 10)

    if (age > toleranceSeconds) {
      console.warn(`Webhook signature too old: ${age}s`)
      return false
    }

    // compute expected signature
    const signed = `${timestamp}.${payload}`
    const expectedSig = signPayload(signed, secret)

    // timingSafeEqual prevents timing attacks
    // comparing strings directly leaks info about where they differ
    return timingSafeEqual(
      Buffer.from(expectedSig, 'hex'),
      Buffer.from(receivedSig, 'hex')
    )
  } catch {
    return false
  }
}