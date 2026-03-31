import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '../src/db/client.js'
import { getProjectAnalytics, getProjectHealth } from '../src/services/metrics.service.js'

const TEST_ORG_ID = 'test-metrics-org'
const TEST_PROJECT_ID = 'test-metrics-project'
const TEST_DEST_ID = 'test-metrics-dest'

describe('metrics service', () => {
  beforeAll(async () => {
    await db.organisation.upsert({
      where: { id: TEST_ORG_ID },
      create: { id: TEST_ORG_ID, name: 'Metrics Test Org' },
      update: {},
    })
    await db.project.upsert({
      where: { id: TEST_PROJECT_ID },
      create: {
        id: TEST_PROJECT_ID,
        name: 'Metrics Project',
        organisationId: TEST_ORG_ID,
        ingestKey: 'metrics-ingest-key',
      },
      update: {},
    })
    await db.destination.upsert({
      where: { id: TEST_DEST_ID },
      create: {
        id: TEST_DEST_ID,
        projectId: TEST_PROJECT_ID,
        url: 'https://webhook.site/metrics-test',
        label: 'test dest',
      },
      update: {},
    })

    // seed 5 events
    const events = await Promise.all(
      Array.from({ length: 5 }, () =>
        db.event.create({
          data: { projectId: TEST_PROJECT_ID, payload: { type: 'test.event' } },
        })
      )
    )

    // 4 success, 1 failed
    await Promise.all([
      ...events.slice(0, 4).map(e =>
        db.deliveryAttempt.create({
          data: {
            eventId: e.id,
            destinationId: TEST_DEST_ID,
            status: 'success',
            httpStatus: 200,
            latencyMs: 300,
            attemptNumber: 1,
          },
        })
      ),
      db.deliveryAttempt.create({
        data: {
          eventId: events[4].id,
          destinationId: TEST_DEST_ID,
          status: 'failed',
          httpStatus: 500,
          latencyMs: 100,
          attemptNumber: 1,
        },
      }),
    ])
  })

  afterAll(async () => {
    await db.deliveryAttempt.deleteMany({ where: { destinationId: TEST_DEST_ID } })
    await db.event.deleteMany({ where: { projectId: TEST_PROJECT_ID } })
    await db.destination.deleteMany({ where: { id: TEST_DEST_ID } })
    await db.project.delete({ where: { id: TEST_PROJECT_ID } })
    await db.organisation.delete({ where: { id: TEST_ORG_ID } })
  })

  it('returns correct event counts in analytics', async () => {
    const analytics = await getProjectAnalytics(TEST_PROJECT_ID)
    expect(analytics.eventsReceived).toBe(5)
    expect(analytics.eventsDelivered).toBe(4)
    expect(analytics.eventsFailed).toBe(1)
  })

  it('calculates delivery rate correctly', async () => {
    const analytics = await getProjectAnalytics(TEST_PROJECT_ID)
    expect(analytics.deliveryRate).toBe(80)
  })

  it('returns destination health with correct status', async () => {
    const health = await getProjectHealth(TEST_PROJECT_ID)
    expect(health).toHaveLength(1)
    // 4/5 = 80% success — 'degraded' (50-95%)
    expect(health[0].status).toBe('degraded')
    expect(health[0].successRate).toBe(80)
  })
})