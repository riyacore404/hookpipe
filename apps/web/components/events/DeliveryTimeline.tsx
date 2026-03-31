'use client'

import { useQuery } from '@tanstack/react-query'
import { useApi, type DeliveryAttempt } from '@/lib/api'

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    success: 'bg-green-500',
    failed:  'bg-red-400',
    dead:    'bg-gray-400',
    pending: 'bg-amber-400',
  }
  return (
    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${colors[status] ?? 'bg-gray-300'}`} />
  )
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

type Props = { eventId: string }

export default function DeliveryTimeline({ eventId }: Props) {
  const api = useApi()

  const { data: attempts, isLoading } = useQuery({
    queryKey: ['deliveries', eventId],
    queryFn: () => api.get<DeliveryAttempt[]>(`/api/deliveries/event/${eventId}`).then(r => r.data),
    refetchInterval: 5_000,
  })

  if (isLoading) {
    return <div className="text-xs text-gray-400 py-4">Loading delivery attempts...</div>
  }

  if (!attempts || attempts.length === 0) {
    return (
      <div className="text-xs text-gray-400 py-4">
        No delivery attempts yet — make sure you have an active destination registered.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0">
      {attempts.map((attempt: DeliveryAttempt, i: number) => (
        <div key={attempt.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <StatusDot status={attempt.status} />
            {i < attempts.length - 1 && (
              <div className="w-px flex-1 bg-gray-100 my-1" />
            )}
          </div>
          <div className="pb-4 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-800">
                Attempt {attempt.attemptNumber}
              </span>
              {attempt.httpStatus && (
                <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                  attempt.httpStatus < 300 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {attempt.httpStatus}
                </span>
              )}
              {attempt.latencyMs && (
                <span className="text-xs text-gray-400">{attempt.latencyMs}ms</span>
              )}
              <span className="text-xs text-gray-400 ml-auto">
                {formatTime(attempt.attemptedAt)}
              </span>
            </div>
            {attempt.destination && (
              <p className="text-xs text-gray-400 font-mono truncate mt-0.5">
                → {attempt.destination.url}
              </p>
            )}
            {attempt.responseBody && (
              <pre className="mt-1.5 text-xs bg-gray-50 border border-gray-100 rounded px-2 py-1.5 text-gray-600 overflow-x-auto whitespace-pre-wrap break-all">
                {attempt.responseBody.slice(0, 200)}
              </pre>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}