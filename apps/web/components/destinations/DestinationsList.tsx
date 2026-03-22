'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { destinationsApi, type Destination } from '@/lib/api'
import HealthSparkline from './HealthSparkline'
import FilterRuleBuilder from './FilterRuleBuilder'

function EnvironmentDot({ isActive }: { isActive: boolean }) {
  return (
    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
  )
}

type Props = { projectId: string }

export default function DestinationsList({ projectId }: Props) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')

  const { data: destinations, isLoading } = useQuery({
    queryKey: ['destinations', projectId],
    queryFn: () => destinationsApi.list(projectId).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => destinationsApi.create({ projectId, url, label }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations', projectId] })
      setUrl('')
      setLabel('')
      setShowForm(false)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      destinationsApi.toggle(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations', projectId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => destinationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations', projectId] })
    },
  })

  if (isLoading) {
    return <div className="text-sm text-gray-400">Loading destinations...</div>
  }

  return (
    <div>

      {/* add destination form */}
      {showForm ? (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-medium text-gray-800 mb-3">Add destination</p>
          <div className="flex flex-col gap-2">
            <input
              type="url"
              placeholder="https://your-server.com/webhook"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 w-full"
            />
            <input
              type="text"
              placeholder="Label (optional) — e.g. Orders service"
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 w-full"
            />
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => createMutation.mutate()}
                disabled={!url || createMutation.isPending}
                className="text-xs px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending ? 'Adding...' : 'Add destination'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="text-xs px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="mb-4 text-xs px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
        >
          + Add destination
        </button>
      )}

      {/* destinations list */}
      {!destinations || destinations.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl px-6 py-10 text-center">
          <p className="text-sm font-medium text-gray-700">No destinations yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Add a destination URL to start receiving webhooks
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          {destinations.map((dest: Destination, i: number) => (
            <div
              key={dest.id}
              className={`px-4 py-3.5 ${i < destinations.length - 1 ? 'border-b border-gray-50' : ''
                }`}
            >
              {/* top row — dot, info, sparkline, actions */}
              <div className="flex items-center gap-3">
                <EnvironmentDot isActive={dest.isActive} />

                <div className="flex-1 min-w-0">
                  {dest.label && (
                    <p className="text-sm font-medium text-gray-800">{dest.label}</p>
                  )}
                  <p className="text-xs font-mono text-gray-400 truncate">{dest.url}</p>
                </div>

                <div className="flex-shrink-0 mx-2">
                  <HealthSparkline destinationId={dest.id} />
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleMutation.mutate({ id: dest.id, isActive: !dest.isActive })}
                    className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-50"
                  >
                    {dest.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(dest.id)}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* filter rules — shown below each destination */}
              <FilterRuleBuilder destinationId={dest.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}