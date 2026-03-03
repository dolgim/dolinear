import { useState } from 'react'
import type { Team } from '@dolinear/shared'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Input,
  Button,
} from '@/components/ui'
import { useCreateTeam } from '@/hooks/use-teams'

interface CreateTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  onSuccess?: (team: Team) => void
}

export function CreateTeamDialog({
  open,
  onOpenChange,
  workspaceId,
  onSuccess,
}: CreateTeamDialogProps) {
  const [name, setName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const createTeam = useCreateTeam()

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setName('')
      setIdentifier('')
    }
    onOpenChange(nextOpen)
  }

  const identifierError =
    identifier && !/^[A-Z]{2,5}$/.test(identifier)
      ? 'Must be 2-5 uppercase letters'
      : undefined

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !identifier.trim() || identifierError) return

    createTeam.mutate(
      { name: name.trim(), identifier: identifier.trim(), workspaceId },
      {
        onSuccess: (team) => {
          handleOpenChange(false)
          onSuccess?.(team)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogTitle>Create team</DialogTitle>
        <DialogDescription>
          Create a new team to organize issues and collaborate.
        </DialogDescription>
        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-4"
          data-testid="create-team-form"
        >
          <Input
            id="team-name"
            label="Team name"
            data-testid="team-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Engineering"
          />
          <Input
            id="team-identifier"
            label="Identifier"
            data-testid="team-identifier-input"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
            placeholder="ENG"
            maxLength={5}
            error={identifierError}
          />
          {identifier && !identifierError && (
            <p className="text-sm text-gray-400">
              Issues will be prefixed with{' '}
              <span className="text-gray-300">{identifier}-1</span>
            </p>
          )}
          {createTeam.error && (
            <p className="text-sm text-red-400" data-testid="create-team-error">
              {createTeam.error.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="create-team-submit"
              disabled={
                !name.trim() ||
                !identifier.trim() ||
                !!identifierError ||
                createTeam.isPending
              }
            >
              {createTeam.isPending ? 'Creating...' : 'Create team'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
