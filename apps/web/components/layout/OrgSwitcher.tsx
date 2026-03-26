'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { api } from '@/lib/api'

type Org = {
  id: string
  name: string
  role: string
}

type Props = {
  projectId?: string
}

export default function OrgSwitcher({ projectId }: Props) {
  const { getToken } = useAuth()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [current, setCurrent] = useState<Org | null>(null)

  useEffect(() => {
    async function fetchOrgs() {
      try {
        const token = await getToken()
        const res = await api.get('/api/organisations', {
          headers: { Authorization: `Bearer ${token}` },
        })
        setOrgs(res.data)
        if (res.data.length > 0) setCurrent(res.data[0])
      } catch {
        // not authed yet or no orgs
      }
    }
    fetchOrgs()
  }, [getToken])

  return (
    <div className="mx-2 my-3 px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 flex justify-between items-center cursor-pointer hover:bg-gray-50">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
        <span className="truncate">
          {current ? current.name : 'No organisation'}
        </span>
      </div>
      <span className="text-gray-400 ml-1 flex-shrink-0">▼</span>
    </div>
  )
}