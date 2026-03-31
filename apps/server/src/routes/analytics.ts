import type { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { requireAuthOrApiKey } from '../middleware/auth.js'

export async function analyticsRoutes(app: FastifyInstance) {

  // GET /api/analytics/health?projectId=xxx
  // returns all destinations for a project with computed health status
  app.get<{ Querystring: { projectId: string } }>(
    '/health',
    { preHandler: requireAuthOrApiKey },
    async (request, reply) => {
      const { projectId } = request.query

      if (!projectId) {
        return reply.status(400).send({ error: 'projectId is required' })
      }

      const destinations = await db.destination.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
      })

      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000)

      const results = await Promise.all(
        destinations.map(async (dest) => {
          const attempts = await db.deliveryAttempt.findMany({
            where: {
              destinationId: dest.id,
              attemptedAt: { gte: thirtyMinsAgo },
            },
            orderBy: { attemptedAt: 'desc' },
            take: 20,
          })

          if (attempts.length === 0) {
            return {
              destinationId: dest.id,
              url: dest.url,
              label: dest.label,
              isActive: dest.isActive,
              successRate: 0,
              avgLatencyMs: null,
              lastAttemptAt: null,
              status: 'unknown' as const,
            }
          }

          const successes = attempts.filter(a => a.status === 'success').length
          const successRate = Math.round((successes / attempts.length) * 100)
          const latencies = attempts
            .filter(a => a.latencyMs !== null)
            .map(a => a.latencyMs as number)
          const avgLatencyMs = latencies.length
            ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
            : null

          const status =
            successRate >= 90 ? 'healthy'
            : successRate >= 50 ? 'degraded'
            : 'down'

          return {
            destinationId: dest.id,
            url: dest.url,
            label: dest.label,
            isActive: dest.isActive,
            successRate,
            avgLatencyMs,
            lastAttemptAt: attempts[0]?.attemptedAt.toISOString() ?? null,
            status,
          }
        })
      )

      return results
    }
  )

  // GET /api/analytics/project?projectId=xxx
  // returns aggregate stats + daily event counts for last 30 days
  app.get<{ Querystring: { projectId: string } }>(
    '/project',
    { preHandler: requireAuthOrApiKey },
    async (request, reply) => {
      const { projectId } = request.query

      if (!projectId) {
        return reply.status(400).send({ error: 'projectId is required' })
      }

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      const [eventsReceived, deliveryStats, dailyRaw] = await Promise.all([
        // total events in last 30 days
        db.event.count({
          where: {
            projectId,
            ingestedAt: { gte: thirtyDaysAgo },
          },
        }),

        // delivery attempt stats
        db.deliveryAttempt.aggregate({
          where: {
            event: { projectId },
            attemptedAt: { gte: thirtyDaysAgo },
          },
          _count: { id: true },
          _avg: { latencyMs: true },
        }),

        // per-day event counts — raw query for grouping by date
        db.$queryRaw<{ date: string; count: bigint }[]>`
          SELECT
            DATE(ingested_at AT TIME ZONE 'UTC')::text AS date,
            COUNT(*)::bigint AS count
          FROM events
          WHERE project_id = ${projectId}
            AND ingested_at >= ${thirtyDaysAgo}
          GROUP BY DATE(ingested_at AT TIME ZONE 'UTC')
          ORDER BY date ASC
        `,
      ])

      const successCount = await db.deliveryAttempt.count({
        where: {
          event: { projectId },
          status: 'success',
          attemptedAt: { gte: thirtyDaysAgo },
        },
      })

      const totalAttempts = deliveryStats._count.id
      const eventsDelivered = successCount
      const eventsFailed = totalAttempts - successCount
      const deliveryRate = totalAttempts > 0
        ? Math.round((successCount / totalAttempts) * 100)
        : 0

      return {
        eventsReceived,
        eventsDelivered,
        eventsFailed,
        avgLatencyMs: deliveryStats._avg.latencyMs
          ? Math.round(deliveryStats._avg.latencyMs)
          : null,
        dailyCounts: dailyRaw.map(r => ({
          date: r.date,
          count: Number(r.count),
        })),
        deliveryRate,
      }
    }
  )
}