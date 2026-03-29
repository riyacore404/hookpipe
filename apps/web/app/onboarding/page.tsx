'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { api } from '@/lib/api'

export default function OnboardingPage() {
  const { getToken } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    setError('')

    try {
      const token = await getToken()

      const orgRes = await api.post(
        '/api/organisations',
        { name },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const org = orgRes.data

      const projectRes = await api.post(
        '/api/projects',
        { name: 'My first project', environment: 'development', organisationId: org.id },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const project = projectRes.data

      router.push(`/projects/${project.id}/events`)
    } catch {
      setError('Something went wrong. Try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Welcome to hookpipe</h1>
        <p className="text-sm text-gray-500 mb-6">Create your organisation to get started</p>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Organisation name — e.g. Acme Corp"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-400 w-full"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            className="text-sm px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating...' : 'Create organisation'}
          </button>
        </div>
      </div>
    </div>
  )
}