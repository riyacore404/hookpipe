import { Queue } from 'bullmq'
import { createRedisClient } from '../lib/redis'

export type FanoutJobData = {
  eventId: string
  projectId: string
}

export const fanoutQueue = new Queue<FanoutJobData>('fanout', {
  connection: createRedisClient(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5 seconds base
    },
    removeOnComplete: 100, // keep last 100 completed jobs for debugging
    removeOnFail: 500,     // keep last 500 failed jobs
  },
})