import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/workspace/$workspaceSlug',
)({
  component: WorkspacePage,
})

function WorkspacePage() {
  const { workspaceSlug } = Route.useParams()

  return (
    <div>
      <h1 className="text-xl font-semibold text-white">
        Workspace: {workspaceSlug}
      </h1>
      <p className="mt-2 text-sm text-gray-400">
        Workspace content will go here.
      </p>
    </div>
  )
}
