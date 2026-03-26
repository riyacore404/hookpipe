import { redis } from '../lib/redis.js'

type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetInSeconds: number
}

// sliding window rate limiter using Redis
// each tenant gets their own counter bucket
export async function checkRateLimit(
  tenantId: string,
  limit = 1000,           // requests per window
  windowSeconds = 60      // window size in seconds
): Promise<RateLimitResult> {
  const key = `ratelimit:ingest:${tenantId}`
  const now = Date.now()
  const windowMs = windowSeconds * 1000

  // use a sorted set — score = timestamp, member = unique request id
  // removes entries outside the current window, counts what remains
  const pipeline = redis.pipeline()

  // remove old entries outside the window
  pipeline.zremrangebyscore(key, 0, now - windowMs)

  // add current request
  pipeline.zadd(key, now, `${now}-${Math.random()}`)

  // count current window
  pipeline.zcard(key)

  // set expiry so keys clean themselves up
  pipeline.expire(key, windowSeconds * 2)

  const results = await pipeline.exec()
  const count = (results?.[2]?.[1] as number) ?? 0

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetInSeconds: windowSeconds,
  }
}