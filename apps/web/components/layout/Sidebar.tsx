'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import OrgSwitcher from './OrgSwitcher'

const NAV_ITEMS = [
  { label: 'Events',       segment: 'events', dot: 'bg-blue-500' },
  { label: 'Destinations', segment: 'destinations', dot: 'bg-green-500' },
  { label: 'Health',       segment: 'health',       dot: 'bg-amber-400' },
  { label: 'Analytics',    segment: 'analytics',    dot: 'bg-purple-400' },
]

type Props = {
  projectId?: string
}

export default function Sidebar({ projectId }: Props) {
  const pathname = usePathname()

  return (
    <aside className="w-52 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">

      {/* logo */}
      <div className="px-4 py-4 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-900">hookpipe</span>
      </div>

      {/* org switcher */}
      <OrgSwitcher projectId={projectId} />

      {/* nav items */}
      <nav className="flex-1 px-2">
        <p className="px-2 mb-1 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
          Project
        </p>
        {NAV_ITEMS.map((item) => {
          const href = projectId
            ? `/projects/${projectId}/${item.segment}`
            : `/${item.segment}`

          const isActive = pathname.includes(`/${item.segment}`)

          return (
            <Link
              key={item.label}
              href={href}
              className={`flex items-center gap-2 px-2 py-2 rounded-md text-sm mb-0.5 transition-colors ${
                isActive
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.dot}`} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* bottom section */}
      <div className="border-t border-gray-100 px-2 py-3">
        <p className="px-2 mb-1 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
          Account
        </p>
        <Link
          href="/api-keys"
          className={`flex items-center gap-2 px-2 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors ${
            pathname === '/api-keys' ? 'bg-gray-100 text-gray-900 font-medium' : ''
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
          API Keys
        </Link>
        <Link
          href="/settings"
          className={`flex items-center gap-2 px-2 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors ${
            pathname === '/settings' ? 'bg-gray-100 text-gray-900 font-medium' : ''
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
          Settings
        </Link>
      </div>
    </aside>
  )
}