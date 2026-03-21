type Props = {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export default function Topbar({ title, subtitle, action }: Props) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
      <div>
        <h1 className="text-base font-medium text-gray-900">{title}</h1>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}