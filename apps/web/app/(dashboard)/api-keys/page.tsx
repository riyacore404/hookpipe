import Topbar from '@/components/layout/Topbar'
import ApiKeysList from '@/components/settings/ApiKeysList'

export default function ApiKeysPage() {
  return (
    <div className="flex flex-col h-full">
      <Topbar title="API keys" subtitle="Programmatic access to your projects" />
      <div className="px-6 py-6">
        <ApiKeysList />
      </div>
    </div>
  )
}