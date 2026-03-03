import { createFileRoute, Link, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/workspace/$workspaceSlug/settings',
)({
  component: SettingsLayout,
})

function SettingsLayout() {
  const { workspaceSlug } = Route.useParams()

  const tabs = [
    { label: 'General', to: '/workspace/$workspaceSlug/settings/general' },
    { label: 'Members', to: '/workspace/$workspaceSlug/settings/members' },
    { label: 'Labels', to: '/workspace/$workspaceSlug/settings/labels' },
    { label: 'Teams', to: '/workspace/$workspaceSlug/settings/teams' },
  ] as const

  return (
    <div className="flex-1 overflow-y-auto p-8" data-testid="settings-layout">
      <h1 className="text-xl font-bold text-white mb-6">Settings</h1>
      <nav className="flex gap-1 border-b border-white/10 mb-6">
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            params={{ workspaceSlug }}
            data-testid={`settings-tab-${tab.label.toLowerCase()}`}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border-b-2 border-transparent -mb-px"
            activeProps={{
              className:
                'text-white border-b-2 border-indigo-500 -mb-px px-4 py-2 text-sm',
            }}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
