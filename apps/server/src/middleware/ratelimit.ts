import type { FastifyRequest, FastifyReply } from 'fastify'
import { checkRateLimit } from '../services/ratelimit.service.js'
import { db } from '../db/client.js'

export async function rateLimitIngest(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { ingestKey } = request.params as { ingestKey: string }

  // look up the project to get the tenant ID
  const project = await db.project.findUnique({
    where: { ingestKey },
    select: { organisationId: true },
  })

  if (!project) return // 404 handled by the route

  const result = await checkRateLimit(
    project.organisationId,
    1000,  // 1000 requests per minute per org
    60
  )

  // set rate limit headers — standard practice
  reply.header('X-RateLimit-Limit', '1000')
  reply.header('X-RateLimit-Remaining', result.remaining.toString())
  reply.header('X-RateLimit-Reset', result.resetInSeconds.toString())

  if (!result.allowed) {
    reply.status(429).send({
      error: 'Rate limit exceeded — max 1000 requests per minute',
      retryAfter: result.resetInSeconds,
    })
  }
}