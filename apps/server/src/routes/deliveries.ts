import type { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { deliveryQueue } from '../queues/delivery.queue.js'

export async function deliveryRoutes(app: FastifyInstance) {

  // get all delivery attempts for an event
  app.get<{ Params: { eventId: string } }>(
    '/event/:eventId',
    async (request, reply) => {
      const attempts = await db.deliveryAttempt.findMany({
        where: { eventId: request.params.eventId },
        include: { destination: true },
        orderBy: { attemptedAt: 'asc' },
      })

      return attempts
    }
  )

  // manual replay — re-enqueue delivery for all active destinations
  app.post<{ Params: { eventId: string } }>(
    '/event/:eventId/replay',
    async (request, reply) => {
      const event = await db.event.findUnique({
        where: { id: request.params.eventId },
        include: {
          project: {
            include: {
              destinations: {
                where: { isActive: true },
              },
            },
          },
        },
      })

      if (!event) {
        return reply.status(404).send({ error: 'Event not found' })
      }

      if (event.project.destinations.length === 0) {
        return reply.status(400).send({ error: 'No active destinations' })
      }

      // enqueue a fresh delivery job per destination
      const jobs = event.project.destinations.map((dest) => ({
        name: 'deliver',
        data: {
          eventId: event.id,
          destinationId: dest.id,
          destinationUrl: dest.url,
          attemptNumber: 1,
        },
      }))

      await deliveryQueue.addBulk(jobs)

      return { replayed: true, destinations: event.project.destinations.length }
    }
  )

  // add this route to fetch delivery attempts for a specific destination (for the sparkline)
  app.get<{ Params: { destinationId: string } }>(
    '/destination/:destinationId',
    async (request) => {
      const attempts = await db.deliveryAttempt.findMany({
        where: { destinationId: request.params.destinationId },
        orderBy: { attemptedAt: 'desc' },
        take: 20, // only need recent ones for sparkline
      })
      return attempts
    }
  )
}