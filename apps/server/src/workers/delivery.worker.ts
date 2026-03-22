import { Worker, type Job } from 'bullmq'
import { createRedisClient } from '../lib/redis.js'
import { attemptDelivery, logDeliveryAttempt, markDeliveryDead } from '../services/delivery.service.js'
import { db } from '../db/client.js'
import type { DeliveryJobData } from '../queues/delivery.queue.js'

export const deliveryWorker = new Worker<DeliveryJobData>(
  'delivery',
  async (job: Job<DeliveryJobData>) => {
    const { eventId, destinationId, destinationUrl, attemptNumber } = job.data

    console.log(`[delivery] attempt ${attemptNumber} → ${destinationUrl}`)

    // fetch payload from db
    const event = await db.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      // don't retry — event genuinely doesn't exist
      throw new Error(`Event ${eventId} not found — skipping`)
    }

    // run the actual HTTP delivery
    const result = await attemptDelivery(
      destinationUrl,
      event.payload,
      eventId,
      attemptNumber
    )

    // always log the attempt — success or failure
    await logDeliveryAttempt(eventId, destinationId, attemptNumber, result)

    console.log(
      `[delivery] ${result.status} (${result.httpStatus ?? 'network error'}) ` +
      `→ ${destinationUrl} in ${result.latencyMs}ms`
    )

    // if failed — throw so BullMQ schedules the retry
    if (result.status === 'failed') {
      throw new Error(`Delivery failed — status ${result.httpStatus ?? 'network error'}`)
    }
  },
  {
    connection: createRedisClient(),
    concurrency: 20,
  }
)

// fires when ALL retries are exhausted — this is the dead letter handler
deliveryWorker.on('failed', async (job, err) => {
  if (!job) return

  const isExhausted = job.attemptsMade >= (job.opts.attempts ?? 1)

  if (isExhausted) {
    console.log(`[delivery] job ${job.id} exhausted all retries — marking dead`)

    const { eventId, destinationId, attemptNumber } = job.data
    await markDeliveryDead(eventId, destinationId, attemptNumber)
  } else {
    console.log(
      `[delivery] job ${job.id} failed attempt ${job.attemptsMade} — ` +
      `will retry (${err.message})`
    )
  }
})