'use client'

import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'

type Props = { projectId: string }

export default function EventsPageStats({ projectId }: Props) {
  const { eventsApi } = useApi()

  const { data: eventsData } = useQuery({
    queryKey: ['events', projectId],
    queryFn: () => eventsApi.list(projectId).then(r => r.data),
    staleTime: 10_000,
  })

  const total = eventsData?.total ?? 0

  const stats = [
    { label: 'Received', value: total > 0 ? total.toString() : '0' },
    { label: 'Delivered', value: '—' },
    { label: 'Failed', value: '—' },
    { label: 'Avg latency', value: '—' },
  ]

  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      {stats.map(stat => (
        <div key={stat.label} className="bg-white border border-gray-100 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
          <p className="text-xl font-medium text-gray-900">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}