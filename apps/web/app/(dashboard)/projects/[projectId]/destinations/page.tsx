import Topbar from '@/components/layout/Topbar'
import DestinationsList from '@/components/destinations/DestinationsList'

type Props = {
  params: Promise<{ projectId: string }>
}

export default async function DestinationsPage({ params }: Props) {
  const { projectId } = await params

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Destinations"
        subtitle="URLs that receive your webhooks"
      />
      <div className="px-6 py-6">
        <DestinationsList projectId={projectId} />
      </div>
    </div>
  )
}