import type { FastifyInstance } from 'fastify'
import { db } from '../db/client'
import { z } from 'zod'

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  environment: z.enum(['production', 'staging', 'development']).default('development'),
  organisationId: z.string().uuid(),
})

export async function projectRoutes(app: FastifyInstance) {

  // List all projects for an org
  app.get<{ Querystring: { orgId: string } }>('/', async (request, reply) => {
    const { orgId } = request.query
    const projects = await db.project.findMany({
      where: { organisationId: orgId },
      orderBy: { createdAt: 'desc' },
    })
    return projects
  })

  // Create a new project
  app.post('/', async (request, reply) => {
    const body = createProjectSchema.safeParse(request.body)

    if (!body.success) {
      return reply.status(400).send({ error: body.error.flatten() })
    }

    const project = await db.project.create({
      data: {
        name: body.data.name,
        environment: body.data.environment,
        organisationId: body.data.organisationId,
      },
    })

    return reply.status(201).send(project)
  })

  // Get single project
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const project = await db.project.findUnique({
      where: { id: request.params.id },
    })
    if (!project) return reply.status(404).send({ error: 'Not found' })
    return project
  })
}