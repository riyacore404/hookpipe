import type { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { requireAuthOrApiKey } from '../middleware/auth.js'
import { z } from 'zod'

const createSchema = z.object({
  destinationId: z.string().uuid(),
  metric: z.enum(['failure_rate', 'dead_letter_count']),
  operator: z.enum(['gt', 'lt']),
  threshold: z.number().min(0),
  windowMinutes: z.number().int().min(1).max(60).default(5),
  channel: z.enum(['slack', 'email']),
  channelTarget: z.string().min(1),
})

export async function alertRuleRoutes(app: FastifyInstance) {
  app.get<{ Params: { destinationId: string } }>(
    '/destination/:destinationId',
    { preHandler: requireAuthOrApiKey },
    async (request) => {
      return db.alertRule.findMany({
        where: { destinationId: request.params.destinationId },
        orderBy: { createdAt: 'desc' },
      })
    }
  )

  app.post('/', { preHandler: requireAuthOrApiKey }, async (request, reply) => {
    const body = createSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: body.error.flatten() })
    }
    const rule = await db.alertRule.create({ data: body.data })
    return reply.status(201).send(rule)
  })

  app.patch<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requireAuthOrApiKey },
    async (request, reply) => {
      const body = z.object({ isActive: z.boolean() }).safeParse(request.body)
      if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
      return db.alertRule.update({ where: { id: request.params.id }, data: body.data })
    }
  )

  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requireAuthOrApiKey },
    async (request, reply) => {
      await db.alertRule.delete({ where: { id: request.params.id } })
      return reply.status(204).send()
    }
  )
}