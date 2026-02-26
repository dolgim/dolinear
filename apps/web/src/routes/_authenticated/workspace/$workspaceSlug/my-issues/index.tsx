import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/workspace/$workspaceSlug/my-issues/',
)({
  component: MyIssuesPage,
})

function MyIssuesPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-white">My Issues</h1>
      <p className="mt-2 text-sm text-gray-400">
        Your assigned issues will appear here.
      </p>
    </div>
  )
}
