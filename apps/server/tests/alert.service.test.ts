import { describe, it, expect, vi } from 'vitest'
import { getFailureRate } from '../src/services/alert.service.js'

// mock the db module
vi.mock('../src/db/client.js', () => ({
  db: {
    deliveryAttempt: {
      count: vi.fn(),
    },
  },
}))

import { db } from '../src/db/client.js'

describe('alert service', () => {
  it('returns 0 when no attempts exist', async () => {
    vi.mocked(db.deliveryAttempt.count).mockResolvedValue(0)
    const rate = await getFailureRate('dest-id', 5)
    expect(rate).toBe(0)
  })

  it('calculates failure rate correctly', async () => {
    // first call = total (10), second call = failed (4)
    vi.mocked(db.deliveryAttempt.count)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(4)

    const rate = await getFailureRate('dest-id', 5)
    expect(rate).toBe(40)
  })
})