import { Queue } from 'bullmq'
import { createRedisClient } from '../lib/redis'

export type DeliveryJobData = {
  eventId: string
  destinationId: string
  destinationUrl: string
  attemptNumber: number
}

export const deliveryQueue = new Queue<DeliveryJobData>('delivery', {
  connection: createRedisClient(),
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 60_000, // 1 minute base — doubles each retry
    },
    removeOnComplete: 500,
    removeOnFail: 1000,
  },
})