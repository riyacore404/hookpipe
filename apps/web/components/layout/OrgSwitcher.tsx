'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { api } from '@/lib/api'

type Org = { id: string; name: string; role: string }

// module-level cache — survives page transitions within the same session
let cachedOrg: Org | null = null

export default function OrgSwitcher() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const [current, setCurrent] = useState<Org | null>(cachedOrg)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    if (cachedOrg) return  // already have it — don't re-fetch

    async function fetchOrg() {
      try {
        const token = await getToken()
        if (!token) return

        const res = await api.get('/api/organisations', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.data.length > 0) {
          cachedOrg = res.data[0]
          setCurrent(cachedOrg)
        }
      } catch {
        // silent — sidebar still renders without org name
      }
    }

    fetchOrg()
  }, [isLoaded, isSignedIn, getToken])

  return (
    <div className="mx-2 my-3 px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 flex justify-between items-center">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
        <span className="truncate">{current ? current.name : '—'}</span>
      </div>
      <span className="text-gray-400 ml-1 flex-shrink-0">▼</span>
    </div>
  )
}