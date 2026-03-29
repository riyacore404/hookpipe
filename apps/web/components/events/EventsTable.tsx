'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { eventsApi, type Event } from '@/lib/api'
import StatusBadge from './StatusBadge'

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) +
    ' · ' +
    d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

function getEventType(payload: Record<string, unknown>): string {
  if (typeof payload.type === 'string') return payload.type
  if (typeof payload.action === 'string') return payload.action
  if (typeof payload.event === 'string') return payload.event
  return 'unknown'
}

type Props = { projectId: string }

export default function EventsTable({ projectId }: Props) {
  const router = useRouter()
  const { getToken } = useAuth()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['events', projectId],
    queryFn: async () => {
      const token = await getToken()
      const res = await eventsApi.list(projectId, 1, token ?? undefined)
      return res.data
    },
    refetchInterval: 10_000,
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
        <button onClick={() => refetch()} className="text-xs text-blue-500 hover:underline">
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
        <div className="text-xs text-gray-400">Send a POST to your ingest URL to see events here</div>
        <code className="mt-2 text-xs bg-gray-100 px-3 py-1.5 rounded text-gray-600">
          POST /ingest/your-ingest-key
        </code>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <div className="grid grid-cols-[140px_1fr_140px_90px_70px] px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        {['Event ID', 'Type', 'Received', 'Status', 'Actions'].map(h => (
          <span key={h} className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{h}</span>
        ))}
      </div>

      {events.map((event: Event) => (
        <div
          key={event.id}
          onClick={() => router.push(`/projects/${projectId}/events/${event.id}`)}
          className="grid grid-cols-[140px_1fr_140px_90px_70px] px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer items-center transition-colors last:border-b-0"
        >
          <span className="font-mono text-xs text-gray-500 truncate">{event.id.slice(0, 8)}...</span>
          <span className="text-sm text-gray-800 truncate">{getEventType(event.payload)}</span>
          <span className="text-xs text-gray-400">{formatDate(event.ingestedAt)}</span>
          <StatusBadge status="pending" />
          <span className="text-xs text-blue-500 hover:underline">View →</span>
        </div>
      ))}

      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
        <span className="text-xs text-gray-400">{data?.total ?? 0} total events</span>
      </div>
    </div>
  )
}