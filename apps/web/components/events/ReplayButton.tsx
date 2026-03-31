'use client'

import { useState } from 'react'
import { useApi } from '@/lib/api'

export default function ReplayButton({ eventId }: { eventId: string }) {
  const api = useApi()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleReplay() {
    setLoading(true)
    try {
      await api.post(`/api/deliveries/event/${eventId}/replay`)
      setDone(true)
      setTimeout(() => setDone(false), 3000)
    } catch (err) {
      console.error('Replay failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleReplay}
      disabled={loading}
      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Replaying...' : done ? 'Replayed ✓' : 'Replay'}
    </button>
  )
}