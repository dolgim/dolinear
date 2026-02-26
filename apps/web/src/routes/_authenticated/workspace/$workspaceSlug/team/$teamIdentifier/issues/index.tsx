import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/workspace/$workspaceSlug/team/$teamIdentifier/issues/',
)({
  component: TeamIssuesPage,
})

function TeamIssuesPage() {
  const { teamIdentifier } = Route.useParams()

  return (
    <div>
      <h1 className="text-xl font-semibold text-white">
        {teamIdentifier} — Issues
      </h1>
      <p className="mt-2 text-sm text-gray-400">
        All issues for this team will appear here.
      </p>
    </div>
  )
}
