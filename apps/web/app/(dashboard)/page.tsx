import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export default async function HomePage() {
  const { getToken } = await auth()
  const token = await getToken()

  if (!token) redirect('/login')

  try {
    const orgsRes = await api.get('/api/organisations', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const orgs = orgsRes.data

    if (!orgs || orgs.length === 0) redirect('/onboarding')

    const projectsRes = await api.get(`/api/projects?orgId=${orgs[0].id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const projects = projectsRes.data

    if (!projects || projects.length === 0) redirect('/onboarding')

    redirect(`/projects/${projects[0].id}/events`)
  } catch (err: any) {
    // Log the actual error so we can see what's failing
    console.error('[dashboard root] fetch failed:', err?.message, err?.response?.status, err?.response?.data)
    redirect('/onboarding')
  }
}