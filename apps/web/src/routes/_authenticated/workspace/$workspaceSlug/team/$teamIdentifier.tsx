import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/workspace/$workspaceSlug/team/$teamIdentifier',
)({
  component: TeamLayout,
})

function TeamLayout() {
  return <Outlet />
}
