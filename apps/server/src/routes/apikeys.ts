import type { FastifyInstance } from 'fastify'
import { randomBytes, createHash } from 'crypto'
import { db } from '../db/client.js'
import { requireAuthOrApiKey } from '../middleware/auth.js'
import { z } from 'zod'

export async function apiKeyRoutes(app: FastifyInstance) {

  // list all API keys for the current user
  app.get(
    '/',
    { preHandler: requireAuthOrApiKey },
    async (request) => {
      const userId = (request as any).userId

      const keys = await db.apiKey.findMany({
        where: { userId, revokedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          label: true,
          lastUsedAt: true,
          createdAt: true,
          // never return keyHash — it's a secret
        },
      })

      return keys
    }
  )

  // generate a new API key
  app.post(
    '/',
    { preHandler: requireAuthOrApiKey },
    async (request, reply) => {
      const userId = (request as any).userId
      const body = z.object({
        label: z.string().optional(),
      }).safeParse(request.body)

      // generate a secure random key — shown ONCE, never stored raw
      const rawKey = `hp_${randomBytes(32).toString('hex')}`
      const keyHash = createHash('sha256').update(rawKey).digest('hex')

      const apiKey = await db.apiKey.create({
        data: {
          userId,
          keyHash,
          label: body.success ? body.data.label ?? null : null,
        },
      })

      // return the raw key ONCE — user must copy it now
      // we only store the hash, so this is the only time it's visible
      return reply.status(201).send({
        id: apiKey.id,
        label: apiKey.label,
        key: rawKey,  // shown once only
        createdAt: apiKey.createdAt,
      })
    }
  )

  // revoke an API key — soft delete
  app.delete(
    '/:id',
    { preHandler: requireAuthOrApiKey },
    async (request, reply) => {
      const userId = (request as any).userId
      const { id } = request.params as { id: string }

      // verify the key belongs to this user
      const key = await db.apiKey.findFirst({
        where: { id, userId },
      })

      if (!key) {
        return reply.status(404).send({ error: 'API key not found' })
      }

      await db.apiKey.update({
        where: { id },
        data: { revokedAt: new Date() },
      })

      return reply.status(204).send()
    }
  )
}