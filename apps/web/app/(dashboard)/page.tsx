import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { api } from '@/lib/api'

export default async function HomePage() {
  const { getToken } = await auth()
  const token = await getToken()

  if (!token) {
    redirect('/login')
  }

  try {
    // fetch orgs for this user
    const res = await api.get('/api/organisations', {
      headers: { Authorization: `Bearer ${token}` },
    })

    const orgs = res.data
    if (orgs.length === 0) {
      // new user — redirect to onboarding
      redirect('/onboarding')
    }

    // get first project in first org
    const firstOrg = orgs[0]
    const projectsRes = await api.get(
      `/api/projects?orgId=${firstOrg.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    const projects = projectsRes.data
    if (projects.length === 0) {
      redirect('/onboarding')
    }

    redirect(`/projects/${projects[0].id}/events`)
  } catch (err) {
    // Don't redirect to /login — that creates an infinite loop
    // if the API is down or returns a non-auth error
    redirect('/onboarding') // or render an error page
  }
}