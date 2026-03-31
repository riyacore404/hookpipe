import { createClerkClient } from '@clerk/fastify'
import { verifyToken } from '@clerk/backend'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { createHash } from 'crypto'
import { db } from '../db/client.js'
import { env } from '../config/env.js'

// single clerk client instance
export const clerkClient = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY,
})

// verifies the request has a valid Clerk session token
// attaches userId to request for downstream use
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization

    // support both Bearer token (API) and session token (web)
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : (request.headers['x-session-token'] as string)

    if (!token) {
      reply.status(401).send({ error: 'Unauthorised — no token provided' })
      return
    }

    const payload = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
    })
    ;(request as any).userId = payload.sub
    ;(request as any).clerkPayload = payload

  } catch {
    reply.status(401).send({ error: 'Unauthorised — invalid or expired token' })
  }
}

// verify an API key — alternative to session token
// used by developers calling your API programmatically
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

    // hash the incoming key and look it up
    const { createHash } = await import('crypto')
    const keyHash = createHash('sha256').update(apiKey).digest('hex')

    const storedKey = await db.apiKey.findUnique({
      where: { keyHash },
    })

    if (!storedKey || storedKey.revokedAt) {
      reply.status(401).send({ error: 'Unauthorised — invalid or revoked API key' })
      return
    }

    // update last used timestamp
    await db.apiKey.update({
      where: { id: storedKey.id },
      data: { lastUsedAt: new Date() },
    })

    ;(request as any).userId = storedKey.userId
    ;(request as any).apiKeyId = storedKey.id

  } catch {
    reply.status(401).send({ error: 'Unauthorised' })
  }
}

// flexible auth — accepts either session token OR api key
// use this on most routes
export async function requireAuthOrApiKey(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Fastify lowercases all headers — these are the correct keys
  const apiKey = request.headers['x-api-key'] as string | undefined
  const authHeader = request.headers['authorization'] as string | undefined

  if (apiKey) return requireApiKey(request, reply)
  if (authHeader) return requireAuth(request, reply)

  reply.status(401).send({ error: 'Unauthorised — provide Bearer token or x-api-key' })
}

// role enforcement helper
// call after requireAuthOrApiKey to check org membership role
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

  const hierarchy = { member: 0, admin: 1, owner: 2 }
  const userLevel = hierarchy[membership.role as keyof typeof hierarchy] ?? -1
  const requiredLevel = hierarchy[minimumRole]

  return { allowed: userLevel >= requiredLevel, role: membership.role }
}