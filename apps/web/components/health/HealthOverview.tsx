'use client'

import { useQuery } from '@tanstack/react-query'
import { useApi, type DestinationHealth } from '@/lib/api'

const STATUS_CONFIG = {
  healthy:  { dot: 'bg-green-500', badge: 'bg-green-50 text-green-700 border-green-200',  label: 'Healthy' },
  degraded: { dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200',  label: 'Degraded' },
  down:     { dot: 'bg-red-500',   badge: 'bg-red-50 text-red-700 border-red-200',        label: 'Down' },
  unknown:  { dot: 'bg-gray-300',  badge: 'bg-gray-100 text-gray-500 border-gray-200',    label: 'No data' },
}

function formatTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

type Props = { projectId: string }

export default function HealthOverview({ projectId }: Props) {
  const api = useApi()

  const { data: destinations, isLoading } = useQuery({
    queryKey: ['health', projectId],
    queryFn: () =>
      api.get<DestinationHealth[]>(`/api/analytics/health?projectId=${projectId}`).then(r => r.data),
    refetchInterval: 30_000,
  })

  if (isLoading) {
    return <div className="text-sm text-gray-400">Loading health data...</div>
  }

  if (!destinations || destinations.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl px-6 py-12 text-center">
        <p className="text-sm font-medium text-gray-700">No destinations configured</p>
        <p className="text-xs text-gray-400 mt-1">Add destinations to see their health here</p>
      </div>
    )
  }

  const counts = destinations.reduce(
    (acc, d) => { acc[d.status] = (acc[d.status] ?? 0) + 1; return acc },
    {} as Record<string, number>
  )

  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Healthy',  value: counts.healthy ?? 0,  color: 'text-green-600' },
          { label: 'Degraded', value: counts.degraded ?? 0, color: 'text-amber-600' },
          { label: 'Down',     value: counts.down ?? 0,     color: 'text-red-600' },
          { label: 'Total',    value: destinations.length,  color: 'text-gray-700' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-gray-100 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-xl font-medium ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_90px_90px_100px] px-4 py-2.5 border-b border-gray-100 bg-gray-50">
          {['Destination', 'Status', 'Success rate', 'Avg latency', 'Last attempt'].map(h => (
            <span key={h} className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{h}</span>
          ))}
        </div>

        {destinations.map((dest: DestinationHealth, i: number) => {
          const cfg = STATUS_CONFIG[dest.status]
          return (
            <div
              key={dest.destinationId}
              className={`grid grid-cols-[1fr_100px_90px_90px_100px] px-4 py-3.5 items-center ${
                i < destinations.length - 1 ? 'border-b border-gray-50' : ''
              }`}
            >
              <div className="min-w-0 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                <div className="min-w-0">
                  {dest.label && (
                    <p className="text-sm font-medium text-gray-800 truncate">{dest.label}</p>
                  )}
                  <p className="text-xs font-mono text-gray-400 truncate">{dest.url}</p>
                </div>
              </div>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border w-fit ${cfg.badge}`}>
                {cfg.label}
              </span>
              <span className="text-sm text-gray-700">
                {dest.status === 'unknown' ? '—' : `${dest.successRate}%`}
              </span>
              <span className="text-sm text-gray-700">
                {dest.avgLatencyMs ? `${dest.avgLatencyMs}ms` : '—'}
              </span>
              <span className="text-xs text-gray-400">{formatTime(dest.lastAttemptAt)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}