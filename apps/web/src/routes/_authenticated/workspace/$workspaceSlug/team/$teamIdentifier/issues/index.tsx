import { createFileRoute } from '@tanstack/react-router'
import { useWorkspaces } from '@/hooks/use-workspaces'
import { useTeams } from '@/hooks/use-teams'
import { IssueList } from '@/components/issues'
import { Button } from '@/components/ui'
import { useCreateIssueContext } from '@/routes/_authenticated/workspace/$workspaceSlug/team/$teamIdentifier'

export const Route = createFileRoute(
  '/_authenticated/workspace/$workspaceSlug/team/$teamIdentifier/issues/',
)({
  component: TeamIssuesPage,
})

function TeamIssuesPage() {
  const { workspaceSlug, teamIdentifier } = Route.useParams()
  const openCreateDialog = useCreateIssueContext()

  const { data: workspaces } = useWorkspaces()
  const workspace = workspaces?.find((ws) => ws.slug === workspaceSlug)

  const { data: teams } = useTeams(workspace?.id ?? '')
  const team = teams?.find((t) => t.identifier === teamIdentifier)

  if (!workspace || !team) {
    return null
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h1 className="text-base font-semibold text-white">Issues</h1>
        {openCreateDialog && (
          <Button
            size="sm"
            data-testid="create-issue-button"
            onClick={openCreateDialog}
          >
            Create issue
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        <IssueList
          workspaceId={workspace.id}
          workspaceSlug={workspaceSlug}
          teamId={team.id}
          teamIdentifier={teamIdentifier}
        />
      </div>
    </div>
  )
}
