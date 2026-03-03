import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/workspace/$workspaceSlug/settings/labels',
)({
  component: LabelsSettingsPage,
})

function LabelsSettingsPage() {
  return (
    <div className="max-w-2xl" data-testid="labels-settings-page">
      <h2 className="text-lg font-semibold text-white mb-4">Labels</h2>
      <p className="text-gray-400 text-sm">Label management coming soon.</p>
    </div>
  )
}
