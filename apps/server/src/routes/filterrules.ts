import type { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { z } from 'zod'

const createSchema = z.object({
  destinationId: z.string().uuid(),
  field: z.string().min(1),
  operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'gt', 'lt', 'exists', 'not_exists']),
  value: z.string(),
})

export async function filterRuleRoutes(app: FastifyInstance) {

  app.get<{ Params: { destinationId: string } }>(
    '/destination/:destinationId',
    async (request) => {
      return db.filterRule.findMany({
        where: { destinationId: request.params.destinationId },
      })
    }
  )

  app.post('/', async (request, reply) => {
    const body = createSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: body.error.flatten() })
    }
    const rule = await db.filterRule.create({ data: body.data })
    return reply.status(201).send(rule)
  })

  app.delete<{ Params: { id: string } }>(
    '/:id',
    async (request, reply) => {
      await db.filterRule.delete({ where: { id: request.params.id } })
      return reply.status(204).send()
    }
  )
}