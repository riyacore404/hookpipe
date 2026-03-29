'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

type ApiKey = { id: string; label: string | null; lastUsedAt: string | null; createdAt: string }

export default function ApiKeysList() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [label, setLabel] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const token = await getToken()
      const res = await api.get('/api/api-keys', {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.data as ApiKey[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      const res = await api.post('/api/api-keys', { label }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      setNewKey(data.key)
      setLabel('')
      setShowForm(false)
    },
  })

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken()
      return api.delete(`/api/api-keys/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  })

  return (
    <div className="max-w-2xl">
      {newKey && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-xs font-medium text-green-800 mb-2">
            API key created — copy it now, it won&apos;t be shown again
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-white border border-green-200 rounded px-3 py-2 text-green-900 break-all">
              {newKey}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(newKey)}
              className="text-xs px-3 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 flex-shrink-0"
            >
              Copy
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="text-xs text-green-600 hover:underline mt-2">
            I&apos;ve copied it — dismiss
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-800">API keys</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          + Generate key
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 bg-white border border-gray-200 rounded-xl">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Label — e.g. Production key"
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
            />
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="text-xs px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-gray-400">Loading...</div>
      ) : !keys || keys.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl px-6 py-10 text-center">
          <p className="text-sm font-medium text-gray-700">No API keys yet</p>
          <p className="text-xs text-gray-400 mt-1">Generate a key to access the API programmatically</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          {keys.map((key, i) => (
            <div
              key={key.id}
              className={`flex items-center gap-3 px-4 py-3 ${i < keys.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{key.label ?? 'Unnamed key'}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {key.lastUsedAt
                    ? `Last used ${new Date(key.lastUsedAt).toLocaleDateString('en-IN')}`
                    : 'Never used'
                  } · Created {new Date(key.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>
              <button
                onClick={() => revokeMutation.mutate(key.id)}
                className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}