import { useState, useEffect, useCallback } from 'react'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useWorkspaces } from '@/hooks/use-workspaces'
import { useTeams } from '@/hooks/use-teams'
import { CreateIssueDialog } from '@/components/issue/CreateIssueDialog'

export const Route = createFileRoute(
  '/_authenticated/workspace/$workspaceSlug/team/$teamIdentifier',
)({
  component: TeamLayout,
})

function TeamLayout() {
  const { workspaceSlug, teamIdentifier } = Route.useParams()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const { data: workspaces } = useWorkspaces()
  const workspace = workspaces?.find((ws) => ws.slug === workspaceSlug)
  const { data: teams } = useTeams(workspace?.id ?? '')
  const team = teams?.find((t) => t.identifier === teamIdentifier)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger if user is typing in an input/textarea
    const target = e.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    ) {
      return
    }

    if (e.key === 'c' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault()
      setCreateDialogOpen(true)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <>
      <Outlet />
      {workspace && team && (
        <CreateIssueDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          workspaceId={workspace.id}
          teamId={team.id}
        />
      )}
    </>
  )
}
