import { Worker, type Job } from 'bullmq'
import { db } from '../db/client.js'
import { createRedisClient } from '../lib/redis.js'
import {
  attemptDelivery,
  logDeliveryAttempt,
  markDeliveryDead,
} from '../services/delivery.service.js'
import { applyTransforms } from '../services/transform.service.js'
import { buildSignatureHeader } from '../lib/hmac.js'
import type { DeliveryJobData } from '../queues/delivery.queue.js'

export const deliveryWorker = new Worker<DeliveryJobData>(
  'delivery',
  async (job: Job<DeliveryJobData>) => {
    const { eventId, destinationId, destinationUrl, attemptNumber } = job.data

    console.log(`[delivery] attempt ${attemptNumber} → ${destinationUrl}`)

    const event = await db.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      throw new Error(`Event ${eventId} not found — skipping`)
    }

    // fetch destination to get signing secret
    const destination = await db.destination.findUnique({
      where: { id: destinationId },
    })

    if (!destination) {
      throw new Error(`Destination ${destinationId} not found — skipping`)
    }

    // start with the raw payload
    let payload = event.payload as Record<string, unknown>

    // apply transforms if any exist (Phase 3 — stored in destination config)
    // for now transforms are empty — UI to configure comes in this phase
    // this is the hook point — transforms will be added here
    payload = applyTransforms(payload, [])

    // build the payload string for signing
    const payloadString = JSON.stringify(payload)

    // build headers — sign if destination has a secret configured
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Hookpipe-Event-Id': eventId,
      'X-Hookpipe-Attempt': String(attemptNumber),
    }

    if (destination.secret) {
      headers['X-Hookpipe-Signature'] = buildSignatureHeader(
        payloadString,
        destination.secret
      )
    }

    // deliver
    const result = await attemptDelivery(
      destinationUrl,
      payload,
      eventId,
      attemptNumber,
      headers  // pass custom headers through
    )

    await logDeliveryAttempt(eventId, destinationId, attemptNumber, result)

    console.log(
      `[delivery] ${result.status} (${result.httpStatus ?? 'network error'}) ` +
      `→ ${destinationUrl} in ${result.latencyMs}ms`
    )

    if (result.status === 'failed') {
      throw new Error(`Delivery failed — ${result.httpStatus ?? 'network error'}`)
    }
  },
  {
    connection: createRedisClient(),
    concurrency: 20,
    settings: {
      backoffStrategy: (attemptsMade: number) => {
        const delays: Record<number, number> = {
          1: 60_000,
          2: 300_000,
          3: 1_800_000,
          4: 7_200_000,
        }
        return delays[attemptsMade] ?? 7_200_000
      },
    },
  }
)

deliveryWorker.on('failed', async (job, err) => {
  if (!job) return
  const isExhausted = job.attemptsMade >= (job.opts.attempts ?? 1)
  if (isExhausted) {
    const { eventId, destinationId, attemptNumber } = job.data
    await markDeliveryDead(eventId, destinationId, attemptNumber)
  }
})