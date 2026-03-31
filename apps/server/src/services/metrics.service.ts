import { db } from '../db/client.js'
import { redis } from '../lib/redis.js'

export type DestinationHealth = {
  destinationId: string
  url: string
  label: string | null
  isActive: boolean
  successRate: number        // percentage over last 30 mins
  avgLatencyMs: number | null
  lastAttemptAt: string | null
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
}

export type ProjectAnalytics = {
  eventsReceived: number
  eventsDelivered: number
  eventsFailed: number
  avgLatencyMs: number | null
  dailyCounts: { date: string; count: number }[]
  deliveryRate: number
}

// health for all destinations in a project (last 30 mins)
export async function getProjectHealth(projectId: string): Promise<DestinationHealth[]> {
  const destinations = await db.destination.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  })

  const since = new Date(Date.now() - 30 * 60 * 1000)

  const results: DestinationHealth[] = []

  for (const dest of destinations) {
    const [total, success, latencyResult, lastAttempt] = await Promise.all([
      db.deliveryAttempt.count({
        where: { destinationId: dest.id, attemptedAt: { gte: since } },
      }),
      db.deliveryAttempt.count({
        where: { destinationId: dest.id, status: 'success', attemptedAt: { gte: since } },
      }),
      db.deliveryAttempt.aggregate({
        where: { destinationId: dest.id, status: 'success', attemptedAt: { gte: since } },
        _avg: { latencyMs: true },
      }),
      db.deliveryAttempt.findFirst({
        where: { destinationId: dest.id },
        orderBy: { attemptedAt: 'desc' },
        select: { attemptedAt: true },
      }),
    ])

    const successRate = total === 0 ? 0 : (success / total) * 100
    let status: DestinationHealth['status'] = 'unknown'

    if (total === 0) status = 'unknown'
    else if (successRate >= 95) status = 'healthy'
    else if (successRate >= 50) status = 'degraded'
    else status = 'down'

    results.push({
      destinationId: dest.id,
      url: dest.url,
      label: dest.label,
      isActive: dest.isActive,
      successRate: Math.round(successRate * 10) / 10,
      avgLatencyMs: latencyResult._avg.latencyMs
        ? Math.round(latencyResult._avg.latencyMs)
        : null,
      lastAttemptAt: lastAttempt?.attemptedAt.toISOString() ?? null,
      status,
    })
  }

  return results
}

// analytics for a project over the last 30 days
export async function getProjectAnalytics(projectId: string): Promise<ProjectAnalytics> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const events = await db.event.findMany({
    where: { projectId, ingestedAt: { gte: since } },
    select: { id: true, ingestedAt: true },
    orderBy: { ingestedAt: 'asc' },
  })

  const eventIds = events.map(e => e.id)

  if (eventIds.length === 0) {
    return {
      eventsReceived: 0,
      eventsDelivered: 0,
      eventsFailed: 0,
      avgLatencyMs: null,
      dailyCounts: [],
      deliveryRate: 0,
    }
  }

  // count events that had AT LEAST ONE successful delivery attempt
  const deliveredEventIds = await db.deliveryAttempt.findMany({
    where: { eventId: { in: eventIds }, status: 'success' },
    select: { eventId: true },
    distinct: ['eventId'],
  })

  // count events that had NO successful delivery (all attempts failed/dead)
  const failedEventIds = await db.deliveryAttempt.findMany({
    where: { eventId: { in: eventIds }, status: { in: ['failed', 'dead'] } },
    select: { eventId: true },
    distinct: ['eventId'],
  })

  const deliveredSet = new Set(deliveredEventIds.map(d => d.eventId))
  const failedSet = new Set(failedEventIds.map(d => d.eventId))

  // an event is "failed" only if it never succeeded
  const trulyFailed = [...failedSet].filter(id => !deliveredSet.has(id)).length

  const latencyResult = await db.deliveryAttempt.aggregate({
    where: { eventId: { in: eventIds }, status: 'success' },
    _avg: { latencyMs: true },
  })

  const countsByDate: Record<string, number> = {}
  for (const event of events) {
    const date = event.ingestedAt.toISOString().slice(0, 10)
    countsByDate[date] = (countsByDate[date] ?? 0) + 1
  }

  const dailyCounts = Object.entries(countsByDate)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const total = events.length
  const delivered = deliveredSet.size
  const deliveryRate = total === 0 ? 0 : Math.round((delivered / total) * 1000) / 10

  return {
    eventsReceived: total,
    eventsDelivered: delivered,
    eventsFailed: trulyFailed,
    avgLatencyMs: latencyResult._avg.latencyMs
      ? Math.round(latencyResult._avg.latencyMs)
      : null,
    dailyCounts,
    deliveryRate,
  }
}

// system health — queue depth, worker connectivity
export async function getSystemHealth(): Promise<{
  status: 'ok' | 'degraded'
  queueDepth: { fanout: number; delivery: number }
  redisConnected: boolean
  dbConnected: boolean
}> {
  let redisConnected = false
  let dbConnected = false
  let fanoutDepth = 0
  let deliveryDepth = 0

  try {
    await redis.ping()
    redisConnected = true

    // get queue depths from Redis sorted sets
    const [fo, dl] = await Promise.all([
      redis.llen('bull:fanout:wait'),
      redis.llen('bull:delivery:wait'),
    ])
    fanoutDepth = fo
    deliveryDepth = dl
  } catch {
    redisConnected = false
  }

  try {
    await db.$queryRaw`SELECT 1`
    dbConnected = true
  } catch {
    dbConnected = false
  }

  return {
    status: redisConnected && dbConnected ? 'ok' : 'degraded',
    queueDepth: { fanout: fanoutDepth, delivery: deliveryDepth },
    redisConnected,
    dbConnected,
  }
}