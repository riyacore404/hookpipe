'use client'

import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import { type Event, type DeliveryAttempt } from '@/lib/api'
import DeliveryTimeline from '@/components/events/DeliveryTimeline'
import ReplayButton from '@/components/events/ReplayButton'
import Link from 'next/link'

function getEventType(payload: Record<string, unknown>): string {
  if (typeof payload.type === 'string') return payload.type
  if (typeof payload.action === 'string') return payload.action
  if (typeof payload.event === 'string') return payload.event
  return 'unknown'
}

type Props = { projectId: string; eventId: string }

export default function EventDetailClient({ projectId, eventId }: Props) {
  const { eventsApi } = useApi()

  const { data: event, isLoading, isError } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.get(eventId).then(r => r.data),
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-sm text-gray-400">Loading event...</div>
      </div>
    )
  }

  if (isError || !event) {
    return (
      <div className="px-6 py-6 text-sm text-gray-500">Event not found.</div>
    )
  }

  const headers = event.headers as Record<string, string> | null
  const filteredHeaders = headers
    ? Object.entries(headers).filter(
        ([k]) => !['host', 'connection', 'content-length', 'accept-encoding'].includes(k.toLowerCase())
      )
    : []

  return (
    <div className="px-6 py-6 grid grid-cols-2 gap-6">

      {/* left — payload + metadata */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Link
            href={`/projects/${projectId}/events`}
            className="text-xs text-blue-500 hover:underline"
          >
            ← Back to events
          </Link>
          <ReplayButton eventId={eventId} />
        </div>

        {/* event type pill */}
        <div className="mb-3">
          <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
            {getEventType(event.payload)}
          </span>
        </div>

        {/* raw payload */}
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Raw payload</p>
          </div>
          <pre className="px-4 py-4 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed max-h-72 overflow-y-auto">
            {JSON.stringify(event.payload, null, 2)}
          </pre>
        </div>

        {/* metadata */}
        <div className="mt-4 bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Metadata</p>
          </div>
          <div className="px-4 py-3 flex flex-col gap-2">
            {[
              { label: 'Event ID', value: event.id },
              { label: 'Received', value: new Date(event.ingestedAt).toLocaleString('en-IN') },
              { label: 'Source IP', value: event.sourceIp ?? '—' },
            ].map(row => (
              <div key={row.label} className="flex justify-between text-xs">
                <span className="text-gray-500">{row.label}</span>
                <span className="font-mono text-gray-700 text-right truncate ml-4 max-w-[240px]">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* request headers */}
        {filteredHeaders.length > 0 && (
          <div className="mt-4 bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Request headers</p>
            </div>
            <div className="px-4 py-3 flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {filteredHeaders.map(([key, val]) => (
                <div key={key} className="flex gap-2 text-xs">
                  <span className="font-mono text-gray-400 flex-shrink-0 truncate max-w-[140px]">{key}:</span>
                  <span className="font-mono text-gray-700 truncate">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* right — delivery timeline */}
      <div>
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Delivery attempts</p>
          </div>
          <div className="px-4 py-4">
            <DeliveryTimeline eventId={eventId} />
          </div>
        </div>
      </div>

    </div>
  )
}