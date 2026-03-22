'use client'

import { useQuery } from '@tanstack/react-query'
import { deliveriesApi, type DeliveryAttempt } from '@/lib/api'

type Props = { destinationId: string }

export default function HealthSparkline({ destinationId }: Props) {
  const { data: attempts } = useQuery({
    queryKey: ['deliveries-dest', destinationId],
    queryFn: () =>
      deliveriesApi.forDestination(destinationId).then(r => r.data),
    staleTime: 30_000,
  })

  if (!attempts || attempts.length === 0) {
    return (
      <span className="text-xs text-gray-300">no data</span>
    )
  }

  // take last 7 attempts
  const recent = attempts.slice(-7)

  return (
    <div className="flex items-end gap-0.5 h-6">
      {recent.map((attempt: DeliveryAttempt) => (
        <div
          key={attempt.id}
          title={`${attempt.status} — ${attempt.httpStatus ?? 'no response'}`}
          className={`w-2 rounded-sm ${
            attempt.status === 'success'
              ? 'bg-green-400'
              : attempt.status === 'dead'
              ? 'bg-gray-300'
              : 'bg-red-400'
          }`}
          style={{
            // taller bar = faster response, shorter = slow/failed
            height: attempt.status === 'success'
              ? `${Math.max(40, Math.min(100, 100 - (attempt.latencyMs ?? 0) / 50))}%`
              : '30%',
          }}
        />
      ))}
    </div>
  )
}