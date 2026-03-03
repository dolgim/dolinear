import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useWorkspaces, useUpdateWorkspace } from '@/hooks/use-workspaces'
import { Button, Input } from '@/components/ui'

export const Route = createFileRoute(
  '/_authenticated/workspace/$workspaceSlug/settings/general',
)({
  component: GeneralSettingsPage,
})

function GeneralSettingsPage() {
  const { workspaceSlug } = Route.useParams()
  const { data: workspaces } = useWorkspaces()
  const workspace = workspaces?.find((ws) => ws.slug === workspaceSlug)
  const updateWorkspace = useUpdateWorkspace()

  const [name, setName] = useState('')

  useEffect(() => {
    if (workspace) {
      setName(workspace.name)
    }
  }, [workspace])

  const handleSave = () => {
    if (!workspace || !name.trim() || name.trim() === workspace.name) return
    updateWorkspace.mutate({
      workspaceId: workspace.id,
      name: name.trim(),
    })
  }

  const isDirty = workspace && name.trim() !== workspace.name && name.trim()

  return (
    <div className="max-w-lg" data-testid="general-settings-page">
      <div className="space-y-6">
        <div>
          <label
            htmlFor="workspace-name"
            className="block text-sm font-medium text-gray-300 mb-1.5"
          >
            Workspace name
          </label>
          <Input
            id="workspace-name"
            data-testid="workspace-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Workspace URL slug
          </label>
          <Input
            data-testid="workspace-slug-input"
            value={workspace?.slug ?? ''}
            disabled
            className="opacity-60"
          />
          <p className="text-xs text-gray-500 mt-1">
            The URL slug cannot be changed.
          </p>
        </div>
        {updateWorkspace.error && (
          <p
            className="text-sm text-red-400"
            data-testid="general-settings-error"
          >
            {updateWorkspace.error.message}
          </p>
        )}
        <Button
          data-testid="save-workspace-name"
          onClick={handleSave}
          disabled={!isDirty || updateWorkspace.isPending}
        >
          {updateWorkspace.isPending ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}
