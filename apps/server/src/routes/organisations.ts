import type { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { requireAuthOrApiKey, requireOrgRole } from '../middleware/auth.js'
import { z } from 'zod'

export async function organisationRoutes(app: FastifyInstance) {

  // create an organisation — caller becomes owner
  app.post(
    '/',
    { preHandler: requireAuthOrApiKey },
    async (request, reply) => {
      const userId = (request as any).userId

      const body = z.object({
        name: z.string().min(1).max(100),
      }).safeParse(request.body)

      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }

      // create org and membership in one transaction
      const org = await db.$transaction(async (tx) => {
        // Upsert the Clerk user into our users table first
        // This satisfies the FK constraint on organisation_members
        await tx.user.upsert({
          where: { id: userId },
          create: {
            id: userId,
            email: `${userId}@clerk.local`, // placeholder — Clerk owns real email
            passwordHash: 'clerk-managed',
          },
          update: {}, // already exists, no changes needed
        })

        const newOrg = await tx.organisation.create({
          data: { name: body.data.name },
        })

        await tx.organisationMember.create({
          data: {
            organisationId: newOrg.id,
            userId,
            role: 'owner',
          },
        })

        return newOrg
      })

      return reply.status(201).send(org)
    }
  )

  // list orgs the current user belongs to
  app.get(
    '/',
    { preHandler: requireAuthOrApiKey },
    async (request) => {
      const userId = (request as any).userId

      const memberships = await db.organisationMember.findMany({
        where: { userId },
        include: { organisation: true },
      })

      return memberships.map(m => ({
        ...m.organisation,
        role: m.role,
      }))
    }
  )

  // get members of an org
  app.get(
    '/:orgId/members',
    { preHandler: requireAuthOrApiKey },
    async (request, reply) => {
      const userId = (request as any).userId
      const { orgId } = request.params as { orgId: string }

      // must be a member to see members
      const { allowed } = await requireOrgRole(userId, orgId, 'member')
      if (!allowed) {
        return reply.status(403).send({ error: 'Forbidden' })
      }

      const members = await db.organisationMember.findMany({
        where: { organisationId: orgId },
        orderBy: { createdAt: 'asc' },
      })

      return members
    }
  )

  // invite a member by userId (Phase 4 — full email invite comes with Clerk webhooks)
  app.post(
    '/:orgId/members',
    { preHandler: requireAuthOrApiKey },
    async (request, reply) => {
      const userId = (request as any).userId
      const { orgId } = request.params as { orgId: string }

      // only admins and owners can invite
      const { allowed } = await requireOrgRole(userId, orgId, 'admin')
      if (!allowed) {
        return reply.status(403).send({ error: 'Forbidden — admin or owner required' })
      }

      const body = z.object({
        userId: z.string(),
        role: z.enum(['member', 'admin']).default('member'),
      }).safeParse(request.body)

      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }

      // check not already a member
      const existing = await db.organisationMember.findUnique({
        where: {
          organisationId_userId: {
            organisationId: orgId,
            userId: body.data.userId,
          },
        },
      })

      if (existing) {
        return reply.status(409).send({ error: 'User is already a member' })
      }

      const member = await db.organisationMember.create({
        data: {
          organisationId: orgId,
          userId: body.data.userId,
          role: body.data.role,
        },
      })

      return reply.status(201).send(member)
    }
  )

  // update member role — owner only
  app.patch(
    '/:orgId/members/:memberId',
    { preHandler: requireAuthOrApiKey },
    async (request, reply) => {
      const userId = (request as any).userId
      const { orgId } = request.params as { orgId: string; memberId: string }

      const { allowed } = await requireOrgRole(userId, orgId, 'owner')
      if (!allowed) {
        return reply.status(403).send({ error: 'Forbidden — owner required' })
      }

      const body = z.object({
        role: z.enum(['member', 'admin']),
      }).safeParse(request.body)

      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }

      const { memberId } = request.params as { orgId: string; memberId: string }

      const member = await db.organisationMember.update({
        where: { id: memberId },
        data: { role: body.data.role },
      })

      return member
    }
  )

  // remove a member — admin or owner only, can't remove yourself
  app.delete(
    '/:orgId/members/:memberId',
    { preHandler: requireAuthOrApiKey },
    async (request, reply) => {
      const userId = (request as any).userId
      const { orgId, memberId } = request.params as { orgId: string; memberId: string }

      const { allowed } = await requireOrgRole(userId, orgId, 'admin')
      if (!allowed) {
        return reply.status(403).send({ error: 'Forbidden' })
      }

      const member = await db.organisationMember.findUnique({
        where: { id: memberId },
      })

      if (!member) {
        return reply.status(404).send({ error: 'Member not found' })
      }

      // can't remove yourself
      if (member.userId === userId) {
        return reply.status(400).send({ error: 'Cannot remove yourself' })
      }

      await db.organisationMember.delete({ where: { id: memberId } })
      return reply.status(204).send()
    }
  )
}