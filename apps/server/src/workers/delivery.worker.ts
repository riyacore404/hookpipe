import { Worker } from 'bullmq'
import { db } from '../db/client.js'
import { createRedisClient } from '../lib/redis.js'
import type { DeliveryJobData } from '../queues/delivery.queue.js'

export const deliveryWorker = new Worker<DeliveryJobData>(
  'delivery',
  async (job) => {
    const { eventId, destinationId, destinationUrl, attemptNumber } = job.data

    // Fetch the event payload from DB
    const event = await db.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      throw new Error(`Event ${eventId} not found`)
    }

    const startTime = Date.now()
    let httpStatus: number | null = null
    let responseBody: string | null = null
    let status = 'success'

    try {
      const response = await fetch(destinationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hookpipe-Event-Id': eventId,
          'X-Hookpipe-Attempt': String(attemptNumber),
          // HMAC signing comes in Phase 3
        },
        body: JSON.stringify(event.payload),
        signal: AbortSignal.timeout(30_000), // 30 second timeout
      })

      httpStatus = response.status
      const text = await response.text()
      responseBody = text.slice(0, 1000) // store first 1000 chars only

      // Treat any 2xx as success
      if (!response.ok) {
        status = 'failed'
        // throw new Error(`Destination returned ${response.status}`)
      }

    } catch (err) {
      // only network-level errors land here (timeout, ECONNREFUSED)
      // HTTP errors like 500 are handled above — response.ok = false
      status = 'failed'

      // Log the attempt even if it failed
      await db.deliveryAttempt.create({
        data: {
          eventId,
          destinationId,
          status: 'failed',
          httpStatus,           // null on network error — that's correct
          responseBody,
          latencyMs: Date.now() - startTime,
          attemptNumber,
        },
      })

      // Re-throw so BullMQ knows to retry
      throw err
    }

    // Log successful delivery
    await db.deliveryAttempt.create({
      data: {
        eventId,
        destinationId,
        status,
        httpStatus,
        responseBody,
        latencyMs: Date.now() - startTime,
        attemptNumber,
      },
    })

    // if it was a 4xx/5xx, tell BullMQ to retry
    if (status === 'failed') {
      throw new Error(`Destination returned ${httpStatus}`)
    }
  },
  {
    connection: createRedisClient(),
    concurrency: 20, // deliver 20 webhooks simultaneously
  }
)

deliveryWorker.on('failed', (job, err) => {
  console.error(`Delivery job ${job?.id} failed:`, err.message)
})