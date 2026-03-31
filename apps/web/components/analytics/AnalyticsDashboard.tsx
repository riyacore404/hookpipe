'use client'

import { useQuery } from '@tanstack/react-query'
import { analyticsApi, type ProjectAnalytics } from '@/lib/api'
import { useAuth } from '@clerk/nextjs'

type Props = { projectId: string }

export default function AnalyticsDashboard({ projectId }: Props) {
  const { getToken } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', projectId],
    queryFn: async () => {
      const token = (await getToken()) ?? undefined
      return analyticsApi.project(projectId, token).then(r => r.data)
    },
    staleTime: 60_000,
  })

  if (isLoading) {
    return <div className="text-sm text-gray-400">Loading analytics...</div>
  }

  if (!data) return null

  const maxCount = Math.max(...data.dailyCounts.map(d => d.count), 1)

  return (
    <div className="flex flex-col gap-6">
      {/* summary stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Events received',  value: data.eventsReceived.toLocaleString() },
          { label: 'Delivered',        value: data.eventsDelivered.toLocaleString() },
          { label: 'Failed',           value: data.eventsFailed.toLocaleString() },
          { label: 'Delivery rate',    value: `${data.deliveryRate}%` },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-gray-100 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className="text-xl font-medium text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* events over time bar chart */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Events received — last 30 days
          </p>
        </div>
        <div className="px-4 py-6">
          {data.dailyCounts.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No events in the last 30 days</p>
          ) : (
            <div className="flex items-end gap-1 h-32">
              {data.dailyCounts.map(({ date, count }) => {
                const pct = (count / maxCount) * 100
                const label = new Date(date).toLocaleDateString('en-IN', {
                  month: 'short', day: 'numeric',
                })
                return (
                  <div key={date} className="flex flex-col items-center flex-1 gap-1">
                    <div
                      className="w-full bg-blue-400 rounded-t-sm transition-all"
                      style={{ height: `${Math.max(pct, 4)}%` }}
                      title={`${label}: ${count}`}
                    />
                    {data.dailyCounts.length <= 14 && (
                      <span className="text-[9px] text-gray-400 -rotate-45 origin-top-left">
                        {label}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* avg latency card */}
      <div className="bg-white border border-gray-100 rounded-xl px-4 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">Average delivery latency</p>
          <p className="text-2xl font-medium text-gray-900">
            {data.avgLatencyMs ? `${data.avgLatencyMs}ms` : '—'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 mb-1">Period</p>
          <p className="text-sm text-gray-700">Last 30 days</p>
        </div>
      </div>
    </div>
  )
}