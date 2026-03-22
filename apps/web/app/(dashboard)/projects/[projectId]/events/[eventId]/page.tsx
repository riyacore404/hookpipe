import { api, type Event, type DeliveryAttempt } from '@/lib/api'
import Topbar from '@/components/layout/Topbar'
import DeliveryTimeline from '@/components/events/DeliveryTimeline'
import ReplayButton from '@/components/events/ReplayButton'
import Link from 'next/link'

type Props = {
  params: Promise<{ projectId: string; eventId: string }>
}

function getEventType(payload: Record<string, unknown>): string {
  if (typeof payload.type === 'string') return payload.type
  if (typeof payload.action === 'string') return payload.action
  if (typeof payload.event === 'string') return payload.event
  return 'unknown'
}

export default async function EventDetailPage({ params }: Props) {
  const { projectId, eventId } = await params

  let event: (Event & { deliveryAttempts: DeliveryAttempt[] }) | null = null

  try {
    const res = await api.get<Event & { deliveryAttempts: DeliveryAttempt[] }>(
      `/api/events/${eventId}`
    )
    event = res.data
  } catch {
    return (
      <div className="px-6 py-6 text-sm text-gray-500">
        Event not found.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={getEventType(event.payload)}
        subtitle={`Event ID: ${event.id}`}
      />

      <div className="px-6 py-6 grid grid-cols-2 gap-6">

        {/* left — payload */}
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

          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Raw payload
              </p>
            </div>
            <pre className="px-4 py-4 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
              {JSON.stringify(event.payload, null, 2)}
            </pre>
          </div>

          {/* metadata */}
          <div className="mt-4 bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Metadata
              </p>
            </div>
            <div className="px-4 py-3 flex flex-col gap-2">
              {[
                { label: 'Event ID', value: event.id },
                { label: 'Received', value: new Date(event.ingestedAt).toLocaleString('en-IN') },
                { label: 'Source IP', value: event.sourceIp ?? '—' },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-xs">
                  <span className="text-gray-500">{row.label}</span>
                  <span className="font-mono text-gray-700 text-right truncate ml-4 max-w-[200px]">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* right — delivery timeline */}
        <div>
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Delivery attempts
              </p>
            </div>
            <div className="px-4 py-4">
              <DeliveryTimeline eventId={eventId} />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}