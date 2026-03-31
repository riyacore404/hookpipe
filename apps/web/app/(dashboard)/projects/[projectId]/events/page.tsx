import Topbar from '@/components/layout/Topbar'
import EventsTable from '@/components/events/EventsTable'
import { api } from '@/lib/api'
import type { ProjectAnalytics } from '@/lib/api'

type Props = {
  params: Promise<{ projectId: string }>
}

export default async function EventsPage({ params }: Props) {
  const { projectId } = await params

  let ingestKey = projectId
  let analytics: ProjectAnalytics | null = null

  try {
    const [projectRes, analyticsRes] = await Promise.all([
      api.get(`/api/projects/${projectId}`),
      api.get<ProjectAnalytics>(`/api/analytics/project/${projectId}`),
    ])
    ingestKey = projectRes.data.ingestKey
    analytics = analyticsRes.data
  } catch {
    // fail gracefully — page still renders
  }

  const stats = [
    { label: 'Received', value: analytics ? analytics.eventsReceived.toLocaleString() : '—' },
    { label: 'Delivered', value: analytics ? analytics.eventsDelivered.toLocaleString() : '—' },
    { label: 'Failed', value: analytics ? analytics.eventsFailed.toLocaleString() : '—' },
    {
      label: 'Avg latency',
      value: analytics?.avgLatencyMs ? `${analytics.avgLatencyMs}ms` : '—',
    },
  ]

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Events" subtitle="All webhooks received by this project" />
      <div className="px-6 py-6">
        <div className="grid grid-cols-4 gap-3 mb-6">
          {stats.map(stat => (
            <div key={stat.label} className="bg-white border border-gray-100 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              <p className="text-xl font-medium text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 mb-6 flex items-center justify-between">
          <code className="text-xs text-gray-600 truncate">
            POST http://localhost:3001/ingest/{ingestKey}
          </code>
          <span className="text-xs text-blue-500 cursor-pointer hover:underline ml-4 flex-shrink-0">
            Copy
          </span>
        </div>

        <EventsTable projectId={projectId} />
      </div>
    </div>
  )
}