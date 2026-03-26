import Topbar from '@/components/layout/Topbar'
import TeamMembers from '@/components/settings/TeamMembers'

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <Topbar title="Settings" subtitle="Organisation settings and team" />
      <div className="px-6 py-6">
        <TeamMembers />
      </div>
    </div>
  )
}