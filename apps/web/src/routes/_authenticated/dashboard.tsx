import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useWorkspaces } from '@/hooks/use-workspaces'
import { WorkspaceCard } from '@/components/workspace/WorkspaceCard'
import { CreateWorkspaceDialog } from '@/components/workspace/CreateWorkspaceDialog'
import { Button } from '@/components/ui'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { data: workspaces, isLoading } = useWorkspaces()

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Workspaces</h1>
        <Button onClick={() => setDialogOpen(true)}>Create workspace</Button>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-gray-400">Loading workspaces...</p>
      ) : !workspaces?.length ? (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            No workspaces yet. Create one to get started.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => (
            <WorkspaceCard key={ws.id} workspace={ws} />
          ))}
        </div>
      )}

      <CreateWorkspaceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={(ws) => {
          window.location.href = `/workspace/${ws.slug}`
        }}
      />
    </div>
  )
}
