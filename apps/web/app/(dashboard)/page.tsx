import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'

export default async function HomePage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/login')
  }

  const memberships = await db.organisationMember.findMany({
    where: { userId },
    include: {
      organisation: {
        include: {
          projects: {
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  if (memberships.length === 0) {
    redirect('/onboarding')
  }

  const membership = memberships.find(m => m.organisation.projects.length > 0)
    ?? memberships[0]

  if (membership.organisation.projects.length === 0) {
    redirect('/onboarding')
  }

  redirect(`/projects/${membership.organisation.projects[0].id}/events`)
}