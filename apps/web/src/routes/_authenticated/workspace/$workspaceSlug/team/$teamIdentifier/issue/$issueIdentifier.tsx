import { createFileRoute } from '@tanstack/react-router'
import { useWorkspaces, useTeams } from '@/hooks'
import { IssueDetailPage } from '@/components/issue/IssueDetailPage'

export const Route = createFileRoute(
  '/_authenticated/workspace/$workspaceSlug/team/$teamIdentifier/issue/$issueIdentifier',
)({
  component: IssueDetailRoute,
})

function IssueDetailRoute() {
  const { workspaceSlug, teamIdentifier, issueIdentifier } = Route.useParams()

  const { data: workspaces, isLoading: wsLoading } = useWorkspaces()
  const workspace = workspaces?.find((ws) => ws.slug === workspaceSlug)

  const { data: teams, isLoading: teamsLoading } = useTeams(workspace?.id ?? '')
  const team = teams?.find((t) => t.identifier === teamIdentifier)

  if (wsLoading || teamsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-400">Workspace not found</p>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-400">Team not found</p>
      </div>
    )
  }

  return (
    <IssueDetailPage
      workspace={workspace}
      team={team}
      issueIdentifier={issueIdentifier}
    />
  )
}
