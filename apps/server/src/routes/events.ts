import type { FastifyInstance } from 'fastify'
import { db } from '../db/client'
import { requireAuthOrApiKey } from '../middleware/auth';

export async function eventRoutes(app: FastifyInstance) {

  // List events for a project — paginated
  app.get<{
    Querystring: { projectId: string; page?: string; limit?: string }
  }>('/', { preHandler: requireAuthOrApiKey }, async (request) => {
    const { projectId, page = '1', limit = '50' } = request.query

    const skip = (Number(page) - 1) * Number(limit)

    const [events, total] = await Promise.all([
      db.event.findMany({
        where: { projectId },
        orderBy: { ingestedAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      db.event.count({ where: { projectId } }),
    ])

    return { events, total, page: Number(page), limit: Number(limit) }
  })

  // Get single event with its delivery attempts
  app.get<{ Params: { id: string } }>('/:id', { preHandler: requireAuthOrApiKey }, async (request, reply) => {
    const event = await db.event.findUnique({
      where: { id: request.params.id },
      include: {
        deliveryAttempts: {
          orderBy: { attemptedAt: 'asc' },
        },
      },
    })
    if (!event) return reply.status(404).send({ error: 'Not found' })
    return event
  })
}