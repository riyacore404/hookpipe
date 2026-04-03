import { createClerkClient } from '@clerk/backend'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifyToken } from '@clerk/backend'
import { db } from '../db/client.js'
import { env } from '../config/env.js'

export const clerkClient = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY,
})

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      reply.status(401).send({ error: 'Unauthorised — no token provided' })
      return
    }

    const token = authHeader.slice(7)

    // Use verifyToken with explicit secretKey — works with session tokens
    const payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY })

    ;(request as any).userId = payload.sub
    ;(request as any).clerkPayload = payload

  } catch (err) {
    console.error('[auth] token verification failed:', (err as Error).message)
    reply.status(401).send({ error: 'Unauthorised — invalid or expired token' })
  }
}

export async function requireApiKey(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const apiKey = request.headers['x-api-key'] as string

    if (!apiKey) {
      reply.status(401).send({ error: 'Unauthorised — no API key provided' })
      return
    }

    const { createHash } = await import('crypto')
    const keyHash = createHash('sha256').update(apiKey).digest('hex')

    const storedKey = await db.apiKey.findUnique({
      where: { keyHash },
      include: { user: true },
    })

    if (!storedKey || storedKey.revokedAt) {
      reply.status(401).send({ error: 'Unauthorised — invalid or revoked API key' })
      return
    }

    await db.apiKey.update({
      where: { id: storedKey.id },
      data: { lastUsedAt: new Date() },
    })

    ;(request as any).userId = storedKey.userId
    ;(request as any).apiKeyId = storedKey.id

  } catch (err) {
    console.error('[auth] api key verification failed:', (err as Error).message)
    reply.status(401).send({ error: 'Unauthorised' })
  }
}

export async function requireAuthOrApiKey(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const hasApiKey = !!request.headers['x-api-key']
  const hasAuth = !!request.headers.authorization

  if (hasApiKey) return requireApiKey(request, reply)
  if (hasAuth) return requireAuth(request, reply)

  reply.status(401).send({ error: 'Unauthorised — provide a Bearer token or x-api-key header' })
}

export async function requireOrgRole(
  userId: string,
  organisationId: string,
  minimumRole: 'member' | 'admin' | 'owner'
): Promise<{ allowed: boolean; role: string | null }> {
  const membership = await db.organisationMember.findUnique({
    where: {
      organisationId_userId: { organisationId, userId },
    },
  })

  if (!membership) return { allowed: false, role: null }

  const roleHierarchy = { member: 0, admin: 1, owner: 2 }
  const userLevel = roleHierarchy[membership.role as keyof typeof roleHierarchy] ?? -1
  const requiredLevel = roleHierarchy[minimumRole]

  return { allowed: userLevel >= requiredLevel, role: membership.role }
}