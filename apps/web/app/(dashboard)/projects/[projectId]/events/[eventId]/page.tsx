import Topbar from '@/components/layout/Topbar'
import EventDetailClient from '@/components/events/EventDetailClient'

type Props = {
  params: Promise<{ projectId: string; eventId: string }>
}

export default async function EventDetailPage({ params }: Props) {
  const { projectId, eventId } = await params

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Event detail" subtitle={`ID: ${eventId.slice(0, 8)}...`} />
      <EventDetailClient projectId={projectId} eventId={eventId} />
    </div>
  )
}