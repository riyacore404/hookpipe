'use client'

import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { Destination, DeliveryAttempt } from '@/lib/api'

type DestinationHealth = Destination & {
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
  successRate: number
  avgLatencyMs: number | null
  lastAttemptAt: string | null
}

const STATUS_CONFIG = {
  healthy:  { dot: 'bg-green-500', badge: 'bg-green-50 text-green-700 border-green-200',  label: 'Healthy' },
  degraded: { dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200',  label: 'Degraded' },
  down:     { dot: 'bg-red-500',   badge: 'bg-red-50 text-red-700 border-red-200',        label: 'Down' },
  unknown:  { dot: 'bg-gray-300',  badge: 'bg-gray-100 text-gray-500 border-gray-200',    label: 'No data' },
}

function computeHealth(dest: Destination, attempts: DeliveryAttempt[]): DestinationHealth {
  if (attempts.length === 0) {
    return { ...dest, status: 'unknown', successRate: 0, avgLatencyMs: null, lastAttemptAt: null }
  }

  const recent = attempts.slice(0, 20) // last 20 attempts
  const successful = recent.filter(a => a.status === 'success')
  const successRate = Math.round((successful.length / recent.length) * 100)

  const latencies = successful.map(a => a.latencyMs).filter((l): l is number => l !== null)
  const avgLatencyMs = latencies.length > 0
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : null

  const lastAttemptAt = attempts[0]?.attemptedAt ?? null

  let status: DestinationHealth['status']
  if (successRate === 100) status = 'healthy'
  else if (successRate >= 60) status = 'degraded'
  else if (successRate === 0) status = 'down'
  else status = 'degraded'

  return { ...dest, status, successRate, avgLatencyMs, lastAttemptAt }
}

function formatTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

type Props = { projectId: string }

// Fetches health for a single destination — runs in parallel for all destinations
function useDestinationHealth(dest: Destination) {
  const { deliveriesApi } = useApi()
  return useQuery({
    queryKey: ['deliveries-dest', dest.id],
    queryFn: () => deliveriesApi.forDestination(dest.id).then(r => r.data),
    staleTime: 30_000,
  })
}

function DestinationRow({ dest, index, total }: { dest: Destination; index: number; total: number }) {
  const { data: attempts = [] } = useDestinationHealth(dest)
  const health = computeHealth(dest, attempts)
  const cfg = STATUS_CONFIG[health.status]

  return (
    <div
      className={`grid grid-cols-[1fr_100px_90px_90px_100px] px-4 py-3.5 items-center ${
        index < total - 1 ? 'border-b border-gray-50' : ''
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
        {health.status === 'unknown' ? '—' : `${health.successRate}%`}
      </span>
      <span className="text-sm text-gray-700">
        {health.avgLatencyMs ? `${health.avgLatencyMs}ms` : '—'}
      </span>
      <span className="text-xs text-gray-400">{formatTime(health.lastAttemptAt)}</span>
    </div>
  )
}

export default function HealthOverview({ projectId }: Props) {
  const { destinationsApi } = useApi()

  const { data: destinations, isLoading } = useQuery({
    queryKey: ['destinations', projectId],
    queryFn: () => destinationsApi.list(projectId).then(r => r.data),
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

  return (
    <div>
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_90px_90px_100px] px-4 py-2.5 border-b border-gray-100 bg-gray-50">
          {['Destination', 'Status', 'Success rate', 'Avg latency', 'Last attempt'].map(h => (
            <span key={h} className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{h}</span>
          ))}
        </div>
        {destinations.map((dest: Destination, i: number) => (
          <DestinationRow key={dest.id} dest={dest} index={i} total={destinations.length} />
        ))}
      </div>
    </div>
  )
}