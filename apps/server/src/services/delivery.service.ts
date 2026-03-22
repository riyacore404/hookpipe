import { db } from '../db/client.js'

type DeliveryResult = {
  status: 'success' | 'failed'
  httpStatus: number | null
  responseBody: string | null
  latencyMs: number
}

// core delivery logic — extracted so it's testable without a worker
export async function attemptDelivery(
  destinationUrl: string,
  payload: unknown,
  eventId: string,
  attemptNumber: number
): Promise<DeliveryResult> {
  const startTime = Date.now()
  let httpStatus: number | null = null
  let responseBody: string | null = null

  try {
    const response = await fetch(destinationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hookpipe-Event-Id': eventId,
        'X-Hookpipe-Attempt': String(attemptNumber),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    })

    httpStatus = response.status
    const text = await response.text()
    responseBody = text.slice(0, 1000)

    return {
      status: response.ok ? 'success' : 'failed',
      httpStatus,
      responseBody,
      latencyMs: Date.now() - startTime,
    }

  } catch (err) {
    // network-level failure — ECONNREFUSED, timeout etc
    return {
      status: 'failed',
      httpStatus: null,
      responseBody: err instanceof Error ? err.message.slice(0, 1000) : 'network error',
      latencyMs: Date.now() - startTime,
    }
  }
}

// writes the result to delivery_attempts table
export async function logDeliveryAttempt(
  eventId: string,
  destinationId: string,
  attemptNumber: number,
  result: DeliveryResult
) {
  return db.deliveryAttempt.create({
    data: {
      eventId,
      destinationId,
      status: result.status,
      httpStatus: result.httpStatus,
      responseBody: result.responseBody,
      latencyMs: result.latencyMs,
      attemptNumber,
    },
  })
}

// marks a job dead after all retries exhausted
export async function markDeliveryDead(
  eventId: string,
  destinationId: string,
  attemptNumber: number
) {
  return db.deliveryAttempt.create({
    data: {
      eventId,
      destinationId,
      status: 'dead',
      httpStatus: null,
      responseBody: 'All retry attempts exhausted',
      latencyMs: 0,
      attemptNumber,
    },
  })
}