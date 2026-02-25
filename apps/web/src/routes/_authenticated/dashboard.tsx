import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-white">Dashboard</h1>
      <p className="mt-2 text-sm text-gray-400">
        Welcome to DOLinear. Select a workspace to get started.
      </p>
    </div>
  )
}
