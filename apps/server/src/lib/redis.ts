import { Redis } from 'ioredis'
import { env } from '../config/env'

// BullMQ needs two separate Redis connections
// one for the queue, one for the worker
// export a factory function so each gets its own

export function createRedisClient() {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,    // required by BullMQ
  })

  client.on('error', (err) => {
    console.error('Redis connection error:', err)
  })

  return client
}

// Single shared client for non-BullMQ use
export const redis = createRedisClient()