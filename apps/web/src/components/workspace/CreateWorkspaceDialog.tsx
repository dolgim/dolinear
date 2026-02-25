import { useState } from 'react'
import type { Workspace } from '@dolinear/shared'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Input,
  Button,
} from '@/components/ui'
import { useCreateWorkspace } from '@/hooks/use-workspaces'
import { generateSlug } from '@/lib/slug'

interface CreateWorkspaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (workspace: Workspace) => void
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateWorkspaceDialogProps) {
  const [name, setName] = useState('')
  const createWorkspace = useCreateWorkspace()
  const slug = generateSlug(name)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    createWorkspace.mutate(
      { name: name.trim(), slug },
      {
        onSuccess: (workspace) => {
          setName('')
          onOpenChange(false)
          onSuccess?.(workspace)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Create workspace</DialogTitle>
        <DialogDescription>
          Create a new workspace to organize your projects.
        </DialogDescription>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Input
            id="workspace-name"
            label="Workspace name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Workspace"
          />
          {slug && (
            <p className="text-sm text-gray-400">
              Slug: <span className="text-gray-300">{slug}</span>
            </p>
          )}
          {createWorkspace.error && (
            <p className="text-sm text-red-400">
              {createWorkspace.error.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createWorkspace.isPending}
            >
              {createWorkspace.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
