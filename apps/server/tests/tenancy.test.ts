import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify from 'fastify'
import { db } from '../src/db/client.js'
import { eventRoutes } from '../src/routes/events.js'
import { randomBytes, createHash } from 'crypto'

const ORG_A_ID = 'test-org-a'
const ORG_B_ID = 'test-org-b'
const USER_A_ID = 'test-tenant-user-a'
const USER_B_ID = 'test-tenant-user-b'
const PROJECT_A_ID = 'test-tenant-project-a'
const PROJECT_B_ID = 'test-tenant-project-b'

describe('tenant isolation', () => {
  let app: ReturnType<typeof Fastify>
  let keyA: string
  let keyB: string

  beforeAll(async () => {
    // seed two separate orgs, projects, events
    await db.organisation.upsert({
      where: { id: ORG_A_ID },
      create: { id: ORG_A_ID, name: 'Org A' },
      update: {},
    })
    await db.organisation.upsert({
      where: { id: ORG_B_ID },
      create: { id: ORG_B_ID, name: 'Org B' },
      update: {},
    })

    await db.project.upsert({
      where: { id: PROJECT_A_ID },
      create: {
        id: PROJECT_A_ID,
        name: 'Project A',
        organisationId: ORG_A_ID,
        ingestKey: 'ingest-key-a',
      },
      update: {},
    })
    await db.project.upsert({
      where: { id: PROJECT_B_ID },
      create: {
        id: PROJECT_B_ID,
        name: 'Project B',
        organisationId: ORG_B_ID,
        ingestKey: 'ingest-key-b',
      },
      update: {},
    })

    // seed one event per project
    await db.event.create({
      data: { projectId: PROJECT_A_ID, payload: { type: 'org_a.event' } },
    })
    await db.event.create({
      data: { projectId: PROJECT_B_ID, payload: { type: 'org_b.event' } },
    })

    // create users first so FK constraints are satisfied
    await db.user.upsert({
      where: { id: USER_A_ID },
      create: { id: USER_A_ID, email: 'user-a@hookpipe.test', passwordHash: 'not-a-real-hash' },
      update: {},
    })
    await db.user.upsert({
      where: { id: USER_B_ID },
      create: { id: USER_B_ID, email: 'user-b@hookpipe.test', passwordHash: 'not-a-real-hash' },
      update: {},
    })

    // create API keys for each user
    const rawA = `hp_${randomBytes(16).toString('hex')}`
    const rawB = `hp_${randomBytes(16).toString('hex')}`
    keyA = rawA
    keyB = rawB

    await db.apiKey.create({
      data: { userId: USER_A_ID, keyHash: createHash('sha256').update(rawA).digest('hex'), label: 'a' },
    })
    await db.apiKey.create({
      data: { userId: USER_B_ID, keyHash: createHash('sha256').update(rawB).digest('hex'), label: 'b' },
    })

    app = Fastify()
    await app.register(eventRoutes, { prefix: '/api/events' })
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
    await db.event.deleteMany({ where: { projectId: { in: [PROJECT_A_ID, PROJECT_B_ID] } } })
    await db.apiKey.deleteMany({ where: { userId: { in: [USER_A_ID, USER_B_ID] } } })
    await db.project.deleteMany({ where: { id: { in: [PROJECT_A_ID, PROJECT_B_ID] } } })
    await db.organisation.deleteMany({ where: { id: { in: [ORG_A_ID, ORG_B_ID] } } })
    await db.user.deleteMany({ where: { id: { in: [USER_A_ID, USER_B_ID] } } })
  })

  it('user A can only see project A events', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/events?projectId=${PROJECT_A_ID}`,
      headers: { 'x-api-key': keyA },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.events.every((e: any) => e.projectId === PROJECT_A_ID)).toBe(true)
    expect(body.events.some((e: any) => e.projectId === PROJECT_B_ID)).toBe(false)
  })
})