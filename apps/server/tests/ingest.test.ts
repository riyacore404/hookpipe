import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify from 'fastify'
import { db } from '../src/db/client.js'
import { ingestRoutes } from '../src/routes/ingest.js'
import { fanoutQueue } from '../src/queues/fanout.queue.js'

// use a real test project — create it once, clean up after
const TEST_PROJECT_ID = 'test-project-id'
const TEST_INGEST_KEY = 'test-ingest-key-123'

describe('ingest endpoint', () => {
  let app: ReturnType<typeof Fastify>

  beforeAll(async () => {
    // seed a test project
    await db.organisation.upsert({
      where: { id: 'test-org-id' },
      create: { id: 'test-org-id', name: 'Test Org' },
      update: {},
    })

    await db.project.upsert({
      where: { id: TEST_PROJECT_ID },
      create: {
        id: TEST_PROJECT_ID,
        name: 'Test Project',
        ingestKey: TEST_INGEST_KEY,
        organisationId: 'test-org-id',
      },
      update: {},
    })

    app = Fastify()
    await app.register(ingestRoutes, { prefix: '/ingest' })
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
    // clean up test data
    await db.event.deleteMany({ where: { projectId: TEST_PROJECT_ID } })
  })

  it('returns 404 for unknown ingest key', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/ingest/unknown-key-xyz',
      payload: { type: 'test' },
    })
    expect(res.statusCode).toBe(404)
  })

  it('saves event to database and returns 200', async () => {
    const payload = { type: 'payment.success', amount: 1000 }

    const res = await app.inject({
      method: 'POST',
      url: `/ingest/${TEST_INGEST_KEY}`,
      payload,
    })

    expect(res.statusCode).toBe(200)

    const body = JSON.parse(res.body)
    expect(body.received).toBe(true)
    expect(body.eventId).toBeDefined()

    // verify it's actually in the database
    const event = await db.event.findUnique({
      where: { id: body.eventId },
    })

    expect(event).not.toBeNull()
    expect(event?.projectId).toBe(TEST_PROJECT_ID)
    expect((event?.payload as any).type).toBe('payment.success')
  })

  it('enqueues a fanout job after saving', async () => {
    // count total jobs across all states before
    const before = await fanoutQueue.getJobCounts(
      'waiting', 'active', 'completed', 'failed'
    )
    const totalBefore = Object.values(before).reduce((a, b) => a + b, 0)

    await app.inject({
      method: 'POST',
      url: `/ingest/${TEST_INGEST_KEY}`,
      payload: { type: 'order.created' },
    })

    // small wait — let BullMQ register the job
    await new Promise(resolve => setTimeout(resolve, 100))

    const after = await fanoutQueue.getJobCounts(
      'waiting', 'active', 'completed', 'failed'
    )
    const totalAfter = Object.values(after).reduce((a, b) => a + b, 0)

    // total jobs across all states increased by at least 1
    expect(totalAfter).toBeGreaterThan(totalBefore)
  })
})