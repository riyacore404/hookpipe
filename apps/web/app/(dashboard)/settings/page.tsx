import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { api } from '@/lib/api'
import Topbar from '@/components/layout/Topbar'
import TeamMembers from '@/components/settings/TeamMembers'

export default async function SettingsPage() {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) redirect('/login')

  let orgId = ''
  try {
    const res = await api.get('/api/organisations', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.data.length > 0) orgId = res.data[0].id
  } catch {
    redirect('/login')
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Settings" subtitle="Organisation settings and team" />
      <div className="px-6 py-6">
        <TeamMembers orgId={orgId} />
      </div>
    </div>
  )
}