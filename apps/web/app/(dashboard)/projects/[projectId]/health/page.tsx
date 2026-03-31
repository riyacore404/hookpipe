import Topbar from '@/components/layout/Topbar'
import HealthOverview from '@/components/health/HealthOverview'

type Props = {
  params: Promise<{ projectId: string }>
}

export default async function HealthPage({ params }: Props) {
  const { projectId } = await params
  return (
    <div className="flex flex-col h-full">
      <Topbar title="Health" subtitle="Live status of all your destinations" />
      <div className="px-6 py-6">
        <HealthOverview projectId={projectId} />
      </div>
    </div>
  )
}