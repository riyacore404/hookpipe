import Sidebar from '@/components/layout/Sidebar'

// No sidebar here — project layout handles it
// This layout only exists to define the route group
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}