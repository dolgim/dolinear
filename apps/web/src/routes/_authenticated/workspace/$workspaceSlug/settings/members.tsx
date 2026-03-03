import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useWorkspaces } from '@/hooks/use-workspaces'
import {
  useWorkspaceMembers,
  useAddWorkspaceMember,
  type WorkspaceMemberWithUser,
} from '@/hooks/use-workspace-members'
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui'

export const Route = createFileRoute(
  '/_authenticated/workspace/$workspaceSlug/settings/members',
)({
  component: MembersSettingsPage,
})

function MembersSettingsPage() {
  const { workspaceSlug } = Route.useParams()
  const { data: workspaces } = useWorkspaces()
  const workspace = workspaces?.find((ws) => ws.slug === workspaceSlug)
  const { data: members } = useWorkspaceMembers(workspace?.id ?? '')
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  return (
    <div className="max-w-2xl" data-testid="members-settings-page">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Members</h2>
        <Button
          data-testid="add-member-button"
          onClick={() => setAddDialogOpen(true)}
        >
          Add member
        </Button>
      </div>

      {members && members.length === 0 && (
        <p className="text-gray-400 text-sm" data-testid="no-members-message">
          No members yet.
        </p>
      )}

      <table className="w-full text-sm" data-testid="members-table">
        <thead>
          <tr className="border-b border-white/10 text-left text-gray-400">
            <th className="pb-2 font-medium">Name</th>
            <th className="pb-2 font-medium">Email</th>
            <th className="pb-2 font-medium">Role</th>
            <th className="pb-2 font-medium">Joined</th>
          </tr>
        </thead>
        <tbody>
          {members?.map((member) => (
            <MemberRow key={member.id} member={member} />
          ))}
        </tbody>
      </table>

      {workspace && (
        <AddMemberDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          workspaceId={workspace.id}
        />
      )}
    </div>
  )
}

function MemberRow({ member }: { member: WorkspaceMemberWithUser }) {
  return (
    <tr
      className="border-b border-white/5"
      data-testid={`member-row-${member.user.email}`}
    >
      <td className="py-3 text-gray-200">{member.user.name || 'Unnamed'}</td>
      <td className="py-3 text-gray-400">{member.user.email}</td>
      <td className="py-3">
        <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-gray-300 capitalize">
          {member.role}
        </span>
      </td>
      <td className="py-3 text-gray-500">
        {new Date(member.createdAt).toLocaleDateString()}
      </td>
    </tr>
  )
}

function AddMemberDialog({
  open,
  onOpenChange,
  workspaceId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
}) {
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const addMember = useAddWorkspaceMember()

  const handleSubmit = () => {
    if (!userId.trim()) return
    addMember.mutate(
      { workspaceId, userId: userId.trim(), role },
      {
        onSuccess: () => {
          setUserId('')
          setRole('member')
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Add member</DialogTitle>
        <DialogDescription>
          Add a user to this workspace by their user ID.
        </DialogDescription>
        <div className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="user-id"
              className="block text-sm font-medium text-gray-300 mb-1.5"
            >
              User ID
            </label>
            <Input
              id="user-id"
              data-testid="add-member-user-id"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Role
            </label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as 'admin' | 'member')}
            >
              <SelectTrigger data-testid="add-member-role-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {addMember.error && (
            <p className="text-sm text-red-400" data-testid="add-member-error">
              {addMember.error.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              data-testid="add-member-submit"
              onClick={handleSubmit}
              disabled={!userId.trim() || addMember.isPending}
            >
              {addMember.isPending ? 'Adding...' : 'Add member'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
