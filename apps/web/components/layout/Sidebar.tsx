'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import OrgSwitcher from './OrgSwitcher'

type Props = {
  projectId?: string
}

export default function Sidebar({ projectId }: Props) {
  const pathname = usePathname()

  const projectBase = projectId ? `/projects/${projectId}` : null

  const projectNav = [
    { label: 'Events',       href: projectBase ? `${projectBase}/events`       : null, dot: 'bg-blue-500' },
    { label: 'Destinations', href: projectBase ? `${projectBase}/destinations` : null, dot: 'bg-green-500' },
  ]

  const accountNav = [
    { label: 'Settings', href: '/settings',  dot: 'bg-gray-400' },
    { label: 'API Keys', href: '/api-keys',  dot: 'bg-purple-400' },
  ]

  return (
    <aside className="w-52 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">

      {/* logo */}
      <div className="px-4 py-4 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-900">hookpipe</span>
      </div>

      {/* org switcher */}
      <OrgSwitcher />

      {/* project nav */}
      <nav className="flex-1 px-2 pt-1">
        <p className="px-2 mb-1 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
          Project
        </p>
        {projectNav.map((item) => {
          if (!item.href) return (
            <div
              key={item.label}
              className="flex items-center gap-2 px-2 py-2 rounded-md text-sm mb-0.5 text-gray-300 cursor-not-allowed"
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.dot} opacity-30`} />
              {item.label}
            </div>
          )

          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.label}
              href={item.href}
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

      {/* account nav */}
      <div className="border-t border-gray-100 px-2 py-3">
        <p className="px-2 mb-1 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
          Account
        </p>
        {accountNav.map((item) => {
          const isActive = pathname === item.href

          return (
            <Link
              key={item.label}
              href={item.href}
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
      </div>

    </aside>
  )
}