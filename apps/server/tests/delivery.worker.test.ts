import { describe, it, expect, vi } from 'vitest'
import { attemptDelivery } from '../src/services/delivery.service.js'

// mock fetch — we don't want real HTTP calls in unit tests
global.fetch = vi.fn()

describe('attemptDelivery', () => {

  it('returns success when destination responds 200', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => 'OK',
    } as Response)

    const result = await attemptDelivery(
      'https://example.com/webhook',
      { type: 'test' },
      'event-id-123',
      1
    )

    expect(result.status).toBe('success')
    expect(result.httpStatus).toBe(200)
    expect(result.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('returns failed when destination responds 500', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    } as Response)

    const result = await attemptDelivery(
      'https://example.com/webhook',
      { type: 'test' },
      'event-id-123',
      1
    )

    expect(result.status).toBe('failed')
    expect(result.httpStatus).toBe(500)
  })

  it('returns failed with null httpStatus on network error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(
      new Error('connect ECONNREFUSED 127.0.0.1:9999')
    )

    const result = await attemptDelivery(
      'https://example.com/webhook',
      { type: 'test' },
      'event-id-123',
      1
    )

    expect(result.status).toBe('failed')
    expect(result.httpStatus).toBeNull()
    expect(result.responseBody).toContain('ECONNREFUSED')
  })

  it('returns failed on timeout', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(
      new DOMException('The operation was aborted', 'AbortError')
    )

    const result = await attemptDelivery(
      'https://example.com/webhook',
      { type: 'test' },
      'event-id-123',
      1
    )

    expect(result.status).toBe('failed')
    expect(result.httpStatus).toBeNull()
  })
})