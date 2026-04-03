'use client'

import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { Event, DeliveryAttempt } from '@/lib/api'

type DayBucket = { date: string; count: number }

function bucketByDay(events: Event[]): DayBucket[] {
  const map: Record<string, number> = {}
  for (const e of events) {
    const day = e.ingestedAt.slice(0, 10) // YYYY-MM-DD
    map[day] = (map[day] ?? 0) + 1
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14) // last 14 days
    .map(([date, count]) => ({ date, count }))
}

function formatDay(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

type Props = { projectId: string }

export default function AnalyticsDashboard({ projectId }: Props) {
  const { eventsApi, deliveriesApi, destinationsApi } = useApi()

  // Fetch last 200 events for analytics — enough for meaningful numbers
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['analytics-events', projectId],
    queryFn: () => eventsApi.list(projectId, 1).then(r => r.data),
    staleTime: 60_000,
  })

  const { data: destinations } = useQuery({
    queryKey: ['destinations', projectId],
    queryFn: () => destinationsApi.list(projectId).then(r => r.data),
    staleTime: 60_000,
  })

  const events = eventsData?.events ?? []
  const total = eventsData?.total ?? 0
  const days = bucketByDay(events)
  const maxCount = days.length > 0 ? Math.max(...days.map(d => d.count)) : 1

  if (eventsLoading) {
    return <div className="text-sm text-gray-400">Loading analytics...</div>
  }

  if (total === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl px-6 py-12 text-center">
        <p className="text-sm font-medium text-gray-700">No events yet</p>
        <p className="text-xs text-gray-400 mt-1">Start sending webhooks to see analytics here</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total events received', value: total.toLocaleString() },
          { label: 'Destinations', value: (destinations?.length ?? 0).toString() },
          { label: 'Events (last 50)', value: events.length.toString() },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-gray-100 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className="text-2xl font-medium text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* events over time bar chart */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">
          Events received — last 14 days
        </p>
        {days.length === 0 ? (
          <p className="text-xs text-gray-400">Not enough data yet</p>
        ) : (
          <div className="flex gap-2 h-40 overflow-x-auto items-end">
            {days.map(({ date, count }) => (
              <div key={date} className="w-6 flex flex-col items-center shrink-0">

                {/* count (top) */}
                <span className="text-[9px] text-gray-400 mb-1">
                  {count}
                </span>

                {/* bar container (fixed height, bottom aligned) */}
                <div className="h-32 flex items-end w-full">
                  <div
                    className="w-full bg-blue-400 rounded-sm"
                    style={{ height: `${Math.max(6, (count / maxCount) * 120)}px` }}
                  />
                </div>

                {/* label (bottom) */}
                <span className="text-[9px] text-gray-400 mt-1 whitespace-nowrap">
                  {formatDay(date)}
                </span>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* per-destination delivery stats */}
      {destinations && destinations.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Per-destination delivery
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {destinations.map(dest => (
              <DestinationDeliveryRow key={dest.id} destinationId={dest.id} label={dest.label} url={dest.url} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DestinationDeliveryRow({
  destinationId,
  label,
  url,
}: {
  destinationId: string
  label: string | null
  url: string
}) {
  const { deliveriesApi } = useApi()

  const { data: attempts } = useQuery({
    queryKey: ['deliveries-dest', destinationId],
    queryFn: () => deliveriesApi.forDestination(destinationId).then(r => r.data),
    staleTime: 30_000,
  })

  const total = attempts?.length ?? 0
  const successful = attempts?.filter((a: DeliveryAttempt) => a.status === 'success').length ?? 0
  const failed = total - successful
  const rate = total > 0 ? Math.round((successful / total) * 100) : null

  const latencies = attempts
    ?.filter((a: DeliveryAttempt): a is DeliveryAttempt & { latencyMs: number } =>
      a.status === 'success' && a.latencyMs !== null
    )
    .map(a => a.latencyMs) ?? []
  const avgLatency = latencies.length > 0
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : null

  return (
    <div className="px-5 py-3 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        {label && <p className="text-sm font-medium text-gray-800">{label}</p>}
        <p className="text-xs font-mono text-gray-400 truncate">{url}</p>
      </div>
      <div className="flex items-center gap-5 text-sm flex-shrink-0">
        <div className="text-center">
          <p className="text-xs text-gray-400">Attempts</p>
          <p className="font-medium text-gray-700">{total}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Success rate</p>
          <p className={`font-medium ${rate === null ? 'text-gray-400' : rate === 100 ? 'text-green-600' : rate >= 80 ? 'text-amber-600' : 'text-red-500'}`}>
            {rate !== null ? `${rate}%` : '—'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Avg latency</p>
          <p className="font-medium text-gray-700">{avgLatency ? `${avgLatency}ms` : '—'}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Failed</p>
          <p className={`font-medium ${failed > 0 ? 'text-red-500' : 'text-gray-400'}`}>{failed > 0 ? failed : '—'}</p>
        </div>
      </div>
    </div>
  )
}