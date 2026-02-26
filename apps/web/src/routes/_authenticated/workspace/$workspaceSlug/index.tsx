import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/workspace/$workspaceSlug/',
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/workspace/$workspaceSlug/my-issues',
      params: { workspaceSlug: params.workspaceSlug },
    })
  },
})
