'use client'

import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import CopyButton from '@/components/ui/CopyButton'

type Props = { projectId: string }

export default function IngestUrlBar({ projectId }: Props) {
  const { projectsApi } = useApi()

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId).then(r => r.data),
    staleTime: 60_000,
  })

  const ingestKey = project?.ingestKey ?? projectId
  const ingestUrl = `http://localhost:3001/ingest/${ingestKey}`

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 mb-6 flex items-center justify-between">
      <code className="text-xs text-gray-600 truncate">{ingestUrl}</code>
      <CopyButton text={ingestUrl} />
    </div>
  )
}