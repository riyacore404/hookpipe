import type { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { requireAuthOrApiKey } from '../middleware/auth.js'
import { z } from 'zod'

const createSchema = z.object({
  destinationId: z.string().uuid(),
  metric: z.enum(['failure_rate', 'queue_depth', 'latency_p95']),
  threshold: z.number().positive(),
  windowMinutes: z.number().int().positive().default(5),
  channel: z.enum(['slack', 'email']),
  notifyUrl: z.string().url(),
})

export async function alertRoutes(app: FastifyInstance) {

  // list all alert rules for the current user's orgs
  app.get(
    '/',
    { preHandler: requireAuthOrApiKey },
    async (request) => {
      const userId = (request as any).userId

      // get all destination IDs the user has access to
      const memberships = await db.organisationMember.findMany({
        where: { userId },
        include: {
          organisation: {
            include: {
              projects: {
                include: { destinations: true },
              },
            },
          },
        },
      })

      const destinationIds = memberships.flatMap(m =>
        m.organisation.projects.flatMap(p =>
          p.destinations.map(d => d.id)
        )
      )

      const rules = await db.alertRule.findMany({
        where: { destinationId: { in: destinationIds } },
        orderBy: { createdAt: 'desc' },
      })

      return rules
    }
  )

  // get active (firing) alerts
  app.get(
    '/active',
    { preHandler: requireAuthOrApiKey },
    async (request) => {
      const userId = (request as any).userId

      const memberships = await db.organisationMember.findMany({
        where: { userId },
        include: {
          organisation: {
            include: {
              projects: {
                include: { destinations: true },
              },
            },
          },
        },
      })

      const destinationIds = memberships.flatMap(m =>
        m.organisation.projects.flatMap(p =>
          p.destinations.map(d => d.id)
        )
      )

      const rules = await db.alertRule.findMany({
        where: {
          destinationId: { in: destinationIds },
          lastFiredAt: { not: null },
        },
        orderBy: { lastFiredAt: 'desc' },
      })

      return rules
    }
  )

  // create an alert rule
  app.post(
    '/',
    { preHandler: requireAuthOrApiKey },
    async (request, reply) => {
      const body = createSchema.safeParse(request.body)

      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }

      const rule = await db.alertRule.create({
        data: {
          destinationId: body.data.destinationId,
          metric: body.data.metric,
          threshold: body.data.threshold,
          windowMinutes: body.data.windowMinutes,
          channel: body.data.channel,
          operator: ">",               // example, depending on your logic
          channelTarget: "https://hooks.slack.com/...", // for Slack; or email address for email
          notifyUrl: body.data.notifyUrl,   // URL to send alert details to when fired
        },
      })

      return reply.status(201).send(rule)
    }
  )

  // delete an alert rule
  app.delete(
    '/:id',
    { preHandler: requireAuthOrApiKey },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      await db.alertRule.delete({ where: { id } })

      return reply.status(204).send()
    }
  )
}