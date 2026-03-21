'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { eventsApi, type Event } from '@/lib/api'
import StatusBadge from './StatusBadge'

// formats "2024-03-21T14:32:00Z" → "14:32 · Mar 21"
function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) +
    ' · ' +
    d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

// pulls the event type out of the payload if it exists
// Stripe sends { type: "payment.success" }, GitHub sends { action: "push" }
function getEventType(payload: Record<string, unknown>): string {
  if (typeof payload.type === 'string') return payload.type
  if (typeof payload.action === 'string') return payload.action
  if (typeof payload.event === 'string') return payload.event
  return 'unknown'
}

type Props = {
  projectId: string
}

export default function EventsTable({ projectId }: Props) {
  const router = useRouter()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['events', projectId],  // cache key — changes when projectId changes
    queryFn: () => eventsApi.list(projectId).then(r => r.data),
    refetchInterval: 10_000,  // auto-refresh every 10s — live feel without websockets
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-sm text-gray-400">Loading events...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <div className="text-sm text-gray-500">Could not load events</div>
        <button
          onClick={() => refetch()}
          className="text-xs text-blue-500 hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  const events = data?.events ?? []

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <div className="text-sm font-medium text-gray-700">No events yet</div>
        <div className="text-xs text-gray-400">
          Send a POST to your ingest URL to see events here
        </div>
        <code className="mt-2 text-xs bg-gray-100 px-3 py-1.5 rounded text-gray-600">
          POST /ingest/your-ingest-key
        </code>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">

      {/* header row */}
      <div className="grid grid-cols-[140px_1fr_140px_90px_70px] px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        {['Event ID', 'Type', 'Received', 'Status', 'Actions'].map(h => (
          <span key={h} className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
            {h}
          </span>
        ))}
      </div>

      {/* event rows */}
      {events.map((event: Event) => (
        <div
          key={event.id}
          onClick={() => router.push(`/projects/${projectId}/events/${event.id}`)}
          className="grid grid-cols-[140px_1fr_140px_90px_70px] px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer items-center transition-colors last:border-b-0"
        >
          {/* id — truncated */}
          <span className="font-mono text-xs text-gray-500 truncate">
            {event.id.slice(0, 8)}...
          </span>

          {/* event type extracted from payload */}
          <span className="text-sm text-gray-800 truncate">
            {getEventType(event.payload)}
          </span>

          {/* timestamp */}
          <span className="text-xs text-gray-400">
            {formatDate(event.ingestedAt)}
          </span>

          {/* status — always 'pending' at Phase 1, delivery status comes in Phase 2 */}
          <StatusBadge status="pending" />

          {/* view detail */}
          <span className="text-xs text-blue-500 hover:underline">
            View →
          </span>
        </div>
      ))}

      {/* footer — total count */}
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {data?.total ?? 0} total events
        </span>
      </div>

    </div>
  )
}