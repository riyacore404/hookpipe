import { describe, it, expect } from 'vitest'
import { signPayload, buildSignatureHeader, verifySignature } from '../src/lib/hmac.js'

describe('signPayload', () => {
  it('produces consistent signature for same input', () => {
    const sig1 = signPayload('hello', 'secret')
    const sig2 = signPayload('hello', 'secret')
    expect(sig1).toBe(sig2)
  })

  it('produces different signature for different payload', () => {
    const sig1 = signPayload('hello', 'secret')
    const sig2 = signPayload('world', 'secret')
    expect(sig1).not.toBe(sig2)
  })

  it('produces different signature for different secret', () => {
    const sig1 = signPayload('hello', 'secret1')
    const sig2 = signPayload('hello', 'secret2')
    expect(sig1).not.toBe(sig2)
  })
})

describe('verifySignature', () => {
  it('verifies a valid signature', () => {
    const payload = JSON.stringify({ type: 'payment.success' })
    const secret = 'test-secret-123'
    const header = buildSignatureHeader(payload, secret)

    expect(verifySignature(payload, header, secret)).toBe(true)
  })

  it('rejects tampered payload', () => {
    const payload = JSON.stringify({ type: 'payment.success' })
    const secret = 'test-secret-123'
    const header = buildSignatureHeader(payload, secret)

    const tamperedPayload = JSON.stringify({ type: 'payment.failed' })
    expect(verifySignature(tamperedPayload, header, secret)).toBe(false)
  })

  it('rejects wrong secret', () => {
    const payload = JSON.stringify({ type: 'payment.success' })
    const header = buildSignatureHeader(payload, 'correct-secret')

    expect(verifySignature(payload, header, 'wrong-secret')).toBe(false)
  })

  it('rejects malformed header', () => {
    expect(verifySignature('payload', 'not-a-valid-header', 'secret')).toBe(false)
  })
})