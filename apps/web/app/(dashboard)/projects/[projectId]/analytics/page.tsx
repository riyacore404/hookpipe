import Topbar from '@/components/layout/Topbar'
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard'

type Props = {
  params: Promise<{ projectId: string }>
}

export default async function AnalyticsPage({ params }: Props) {
  const { projectId } = await params
  return (
    <div className="flex flex-col h-full">
      <Topbar title="Analytics" subtitle="Events and delivery metrics — last 30 days" />
      <div className="px-6 py-6">
        <AnalyticsDashboard projectId={projectId} />
      </div>
    </div>
  )
}