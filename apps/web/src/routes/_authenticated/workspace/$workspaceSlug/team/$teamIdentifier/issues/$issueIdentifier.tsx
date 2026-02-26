import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/workspace/$workspaceSlug/team/$teamIdentifier/issues/$issueIdentifier',
)({
  component: IssueDetailPage,
})

function IssueDetailPage() {
  const { issueIdentifier } = Route.useParams()

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-white">{issueIdentifier}</h1>
      <p className="mt-2 text-sm text-gray-400">
        Issue detail page (coming soon).
      </p>
    </div>
  )
}
