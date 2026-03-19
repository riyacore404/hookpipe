import { Worker } from 'bullmq'
import { db } from '../db/client'
import { deliveryQueue } from '../queues/delivery.queue'
import { createRedisClient } from '../lib/redis'
import type { FanoutJobData } from '../queues/fanout.queue'

export const fanoutWorker = new Worker<FanoutJobData>(
  'fanout',
  async (job) => {
    const { eventId, projectId } = job.data

    // Get all active destinations for this project
    const destinations = await db.destination.findMany({
      where: {
        projectId,
        isActive: true,
      },
    })

    if (destinations.length === 0) {
      // No destinations configured yet — that's fine, log and exit
      job.log(`No active destinations for project ${projectId}`)
      return
    }

    // Spawn one independent delivery job per destination
    // They will run in parallel and fail/retry independently
    const jobs = destinations.map((dest) => ({
      name: 'deliver',
      data: {
        eventId,
        destinationId: dest.id,
        destinationUrl: dest.url,
        attemptNumber: 1,
      },
    }))

    await deliveryQueue.addBulk(jobs)

    job.log(`Fanned out to ${destinations.length} destinations`)
  },
  {
    connection: createRedisClient(),
    concurrency: 10, // process up to 10 fanout jobs simultaneously
  }
)

fanoutWorker.on('failed', (job, err) => {
  console.error(`Fanout job ${job?.id} failed:`, err.message)
})