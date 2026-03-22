import { Worker, type Job } from 'bullmq'
import { db } from '../db/client.js'
import { deliveryQueue } from '../queues/delivery.queue.js'
import { createRedisClient } from '../lib/redis.js'
import { shouldDeliver } from '../services/filter.service.js'
import type { FanoutJobData } from '../queues/fanout.queue.js'

export const fanoutWorker = new Worker<FanoutJobData>(
  'fanout',
  async (job: Job<FanoutJobData>) => {
    const { eventId, projectId } = job.data

    // fetch event payload — needed to evaluate filter rules
    const event = await db.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      throw new Error(`Event ${eventId} not found`)
    }

    // fetch all active destinations with their filter rules
    const destinations = await db.destination.findMany({
      where: { projectId, isActive: true },
      include: { filterRules: true },
    })

    if (destinations.length === 0) {
      job.log(`No active destinations for project ${projectId}`)
      return
    }

    const payload = event.payload as Record<string, unknown>
    const jobsToCreate = []

    for (const dest of destinations) {
      // evaluate filter rules — skip if rules don't pass
      const passes = shouldDeliver(payload, dest.filterRules)

      if (!passes) {
        job.log(`Event ${eventId} filtered out for destination ${dest.id}`)
        console.log(`[fanout] filtered out → ${dest.url} (rules did not match)`)
        continue
      }

      jobsToCreate.push({
        name: 'deliver',
        data: {
          eventId,
          destinationId: dest.id,
          destinationUrl: dest.url,
          attemptNumber: 1,
        },
      })
    }

    if (jobsToCreate.length === 0) {
      job.log(`All destinations filtered out for event ${eventId}`)
      return
    }

    await deliveryQueue.addBulk(jobsToCreate)

    console.log(
      `[fanout] event ${eventId} → ${jobsToCreate.length}/${destinations.length} destinations`
    )
  },
  {
    connection: createRedisClient(),
    concurrency: 10,
  }
)

fanoutWorker.on('failed', (job, err) => {
  console.error(`[fanout] job ${job?.id} failed:`, err.message)
})