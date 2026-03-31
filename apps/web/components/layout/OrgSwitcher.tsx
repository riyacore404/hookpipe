'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { api } from '@/lib/api'

type Org = {
  id: string
  name: string
  role: string
}

export default function OrgSwitcher({ projectId }: { projectId?: string }) {
  const { getToken } = useAuth()
  const router = useRouter()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken()
        const res = await api.get('/api/organisations', {
          headers: { Authorization: `Bearer ${token}` },
        })
        setOrgs(res.data)

        // determine active org from current projectId via localStorage
        const stored = localStorage.getItem('hookpipe_active_org')
        if (stored && res.data.find((o: Org) => o.id === stored)) {
          setActiveOrgId(stored)
        } else if (res.data.length > 0) {
          setActiveOrgId(res.data[0].id)
          localStorage.setItem('hookpipe_active_org', res.data[0].id)
        }
      } catch {
        // not authed yet
      }
    }
    load()
  }, [getToken])

  const activeOrg = orgs.find(o => o.id === activeOrgId) ?? orgs[0]

  async function switchOrg(org: Org) {
    localStorage.setItem('hookpipe_active_org', org.id)
    setActiveOrgId(org.id)
    setOpen(false)

    // fetch first project of new org and navigate there
    try {
      const token = await getToken()
      const res = await api.get(`/api/projects?orgId=${org.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const projects = res.data
      if (projects.length > 0) {
        router.push(`/projects/${projects[0].id}/events`)
      } else {
        router.push('/onboarding')
      }
    } catch {
      // stay on current page
    }
  }

  if (orgs.length === 0) {
    return (
      <div className="mx-2 my-3 px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-400">
        Loading...
      </div>
    )
  }

  return (
    <div className="relative mx-2 my-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 flex justify-between items-center hover:bg-gray-50"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
          <span className="truncate">{activeOrg?.name ?? 'Select org'}</span>
        </div>
        <span className="text-gray-400 ml-1 flex-shrink-0">{open ? '▲' : '▼'}</span>
      </button>

      {open && orgs.length > 1 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-sm z-50 overflow-hidden">
          {orgs.map(org => (
            <button
              key={org.id}
              onClick={() => switchOrg(org)}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 ${
                org.id === activeOrgId ? 'text-gray-900 font-medium' : 'text-gray-600'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                org.id === activeOrgId ? 'bg-purple-500' : 'bg-gray-300'
              }`} />
              {org.name}
              <span className="ml-auto text-gray-400">{org.role}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}