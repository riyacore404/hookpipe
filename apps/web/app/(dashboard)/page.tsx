import { redirect } from 'next/navigation'

// visiting / sends you to /projects
// Phase 4 makes this smarter — redirect to last visited project
export default function HomePage() {
  redirect('/projects')
}