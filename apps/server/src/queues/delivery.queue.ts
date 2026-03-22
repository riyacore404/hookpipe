import { Queue } from 'bullmq'
import { env } from '../config/env.js'

export type DeliveryJobData = {
  eventId: string
  destinationId: string
  destinationUrl: string
  attemptNumber: number
}

export const deliveryQueue = new Queue<DeliveryJobData>('delivery', {
  connection: {
    url: env.REDIS_URL,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  },
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'custom',
    },
    removeOnComplete: 500,
    removeOnFail: 1000,
  },
})