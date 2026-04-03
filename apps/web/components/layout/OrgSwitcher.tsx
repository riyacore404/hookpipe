'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/useApi'

type Org = { id: string; name: string; role: string }

type Props = { projectId?: string }

export default function OrgSwitcher({ projectId }: Props) {
  const { organisationsApi, ready } = useApi()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [current, setCurrent] = useState<Org | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!ready) return
    organisationsApi.list()
      .then(res => {
        setOrgs(res.data)
        if (res.data.length > 0) setCurrent(res.data[0])
      })
      .catch(() => {})
  }, [ready])

  return (
    <div className="relative mx-2 my-3">
      <div
        onClick={() => setOpen(prev => !prev)}
        className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 flex justify-between items-center cursor-pointer hover:bg-gray-50"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
          <span className="truncate">
            {current ? current.name : 'Loading...'}
          </span>
        </div>
        <span className="text-gray-400 ml-1">▼</span>
      </div>

      {open && (
        <div className="absolute mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-md z-10">
          {orgs.map(org => (
            <div
              key={org.id}
              onClick={() => {
                setCurrent(org)
                setOpen(false)
              }}
              className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
            >
              {org.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}