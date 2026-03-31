import type { FastifyInstance } from 'fastify'
import { getSystemHealth } from '../services/metrics.service.js'

export async function healthRoutes(app: FastifyInstance) {
  // public health endpoint — no auth required
  app.get('/', async (_request, reply) => {
    const health = await getSystemHealth()
    const statusCode = health.status === 'ok' ? 200 : 503
    return reply.status(statusCode).send(health)
  })
}