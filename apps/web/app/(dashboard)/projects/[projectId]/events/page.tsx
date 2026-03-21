import Topbar from '@/components/layout/Topbar'
import EventsTable from '@/components/events/EventsTable'
import { api } from '@/lib/api'

type Props = {
  params: Promise<{ projectId: string }>
}

export default async function EventsPage({ params }: Props) {
  const { projectId } = await params

  // fetch the project server-side so we have the ingestKey
  let ingestKey = projectId // fallback
  try {
    const res = await api.get(`/api/projects/${projectId}`)
    ingestKey = res.data.ingestKey
  } catch {
    // if fetch fails, fallback to projectId — page still renders
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Events"
        subtitle="All webhooks received by this project"
      />
      <div className="px-6 py-6">

        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Received', value: '—' },
            { label: 'Delivered', value: '—' },
            { label: 'Failed', value: '—' },
            { label: 'Avg latency', value: '—' },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-gray-100 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              <p className="text-xl font-medium text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* now shows real ingest key */}
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