import type { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { z } from 'zod'
import { requireAuthOrApiKey } from '../middleware/auth.js'

const createSchema = z.object({
  projectId: z.string().uuid(),
  url: z.string().url(),
  label: z.string().optional(),
})

const updateSchema = z.object({
  label: z.string().optional(),
  url: z.string().url().optional(),
  isActive: z.boolean().optional(),
})

export async function destinationRoutes(app: FastifyInstance) {

  // list all destinations for a project
  app.get<{ Querystring: { projectId: string } }>(
    '/',
    { preHandler: requireAuthOrApiKey },
    async (request, reply) => {
      const { projectId } = request.query

      if (!projectId) {
        return reply.status(400).send({ error: 'projectId is required' })
      }

      const destinations = await db.destination.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
      })

      return destinations
    }
  )

  // create a destination
  app.post('/', { preHandler: requireAuthOrApiKey }, async (request, reply) => {
    const body = createSchema.safeParse(request.body)

    if (!body.success) {
      return reply.status(400).send({ error: body.error.flatten() })
    }

    // verify the project exists before creating
    const project = await db.project.findUnique({
      where: { id: body.data.projectId },
    })

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' })
    }

    const destination = await db.destination.create({
      data: {
        projectId: body.data.projectId,
        url: body.data.url,
        label: body.data.label ?? null,
      },
    })

    return reply.status(201).send(destination)
  })

  // get single destination
  app.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requireAuthOrApiKey },
    async (request, reply) => {
      const destination = await db.destination.findUnique({
        where: { id: request.params.id },
      })

      if (!destination) {
        return reply.status(404).send({ error: 'Not found' })
      }

      return destination
    }
  )

  // update — toggle active, change url, change label
  app.patch<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requireAuthOrApiKey },
    async (request, reply) => {
      const body = updateSchema.safeParse(request.body)

      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }

      const destination = await db.destination.update({
        where: { id: request.params.id },
        data: body.data,
      })

      return destination
    }
  )

  // delete — hard delete only if no delivery attempts exist
  // otherwise soft delete via isActive = false
  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requireAuthOrApiKey },
    async (request, reply) => {
      const attempts = await db.deliveryAttempt.count({
        where: { destinationId: request.params.id },
      })

      if (attempts > 0) {
        // has history — soft delete
        await db.destination.update({
          where: { id: request.params.id },
          data: { isActive: false },
        })
      } else {
        // no history — safe to hard delete
        await db.destination.delete({
          where: { id: request.params.id },
        })
      }

      return reply.status(204).send()
    }
  )
}