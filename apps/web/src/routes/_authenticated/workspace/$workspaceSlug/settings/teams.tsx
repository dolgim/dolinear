import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import type { Team } from '@dolinear/shared'
import { useWorkspaces } from '@/hooks/use-workspaces'
import { useTeams, useUpdateTeam, useDeleteTeam } from '@/hooks/use-teams'
import { CreateTeamDialog } from '@/components/team/CreateTeamDialog'
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui'

export const Route = createFileRoute(
  '/_authenticated/workspace/$workspaceSlug/settings/teams',
)({
  component: TeamsSettingsPage,
})

function TeamsSettingsPage() {
  const { workspaceSlug } = Route.useParams()
  const { data: workspaces } = useWorkspaces()
  const workspace = workspaces?.find((ws) => ws.slug === workspaceSlug)
  const { data: teams } = useTeams(workspace?.id ?? '')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  return (
    <div className="mx-auto max-w-2xl" data-testid="teams-settings-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Teams</h1>
        <Button
          data-testid="create-team-button"
          onClick={() => setCreateDialogOpen(true)}
        >
          Create team
        </Button>
      </div>

      {teams && teams.length === 0 && (
        <p className="text-gray-400 text-sm" data-testid="no-teams-message">
          No teams yet. Create one to get started.
        </p>
      )}

      <ul className="space-y-2" data-testid="teams-list">
        {teams?.map((team) => (
          <TeamRow
            key={team.id}
            team={team}
            workspaceId={workspace?.id ?? ''}
          />
        ))}
      </ul>

      {workspace && (
        <CreateTeamDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          workspaceId={workspace.id}
        />
      )}
    </div>
  )
}

function TeamRow({ team, workspaceId }: { team: Team; workspaceId: string }) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(team.name)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const updateTeam = useUpdateTeam()
  const deleteTeam = useDeleteTeam()

  const handleSave = () => {
    if (!editName.trim() || editName.trim() === team.name) {
      setEditing(false)
      setEditName(team.name)
      return
    }
    updateTeam.mutate(
      { workspaceId, teamId: team.id, name: editName.trim() },
      { onSuccess: () => setEditing(false) },
    )
  }

  const handleDelete = () => {
    deleteTeam.mutate(
      { workspaceId, teamId: team.id },
      { onSuccess: () => setDeleteDialogOpen(false) },
    )
  }

  return (
    <li
      data-testid={`team-row-${team.identifier}`}
      className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-4 py-3"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="shrink-0 rounded bg-indigo-500/20 px-2 py-0.5 text-xs font-mono text-indigo-300">
          {team.identifier}
        </span>
        {editing ? (
          <Input
            data-testid={`team-edit-name-${team.identifier}`}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') {
                setEditing(false)
                setEditName(team.name)
              }
            }}
            className="!py-1 !px-2 text-sm"
            autoFocus
          />
        ) : (
          <span className="text-sm text-gray-200 truncate">{team.name}</span>
        )}
      </div>
      {(updateTeam.error || deleteTeam.error) && (
        <p className="text-sm text-red-400 mx-3">
          {updateTeam.error?.message || deleteTeam.error?.message}
        </p>
      )}
      <div className="flex items-center gap-2 shrink-0 ml-4">
        {editing ? (
          <>
            <Button
              variant="secondary"
              data-testid={`team-save-${team.identifier}`}
              onClick={handleSave}
              disabled={updateTeam.isPending}
            >
              {updateTeam.isPending ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setEditing(false)
                setEditName(team.name)
              }}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              data-testid={`team-edit-${team.identifier}`}
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
            <Button
              variant="secondary"
              data-testid={`team-delete-${team.identifier}`}
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete
            </Button>
          </>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogTitle>Delete team</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{' '}
            <span className="font-semibold text-white">{team.name}</span>? This
            will permanently delete all issues in this team.
          </DialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              data-testid={`team-delete-confirm-${team.identifier}`}
              onClick={handleDelete}
              disabled={deleteTeam.isPending}
            >
              {deleteTeam.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </li>
  )
}
