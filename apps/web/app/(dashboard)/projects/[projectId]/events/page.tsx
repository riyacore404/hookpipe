import Topbar from '@/components/layout/Topbar'
import EventsTable from '@/components/events/EventsTable'
import EventsPageStats from '@/components/events/EventsPageStats'
import IngestUrlBar from '@/components/events/IngestUrlBar'

type Props = {
  params: Promise<{ projectId: string }>
}

export default async function EventsPage({ params }: Props) {
  const { projectId } = await params

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Events" subtitle="All webhooks received by this project" />
      <div className="px-6 py-6">
        <EventsPageStats projectId={projectId} />
        <IngestUrlBar projectId={projectId} />
        <EventsTable projectId={projectId} />
      </div>
    </div>
  )
}