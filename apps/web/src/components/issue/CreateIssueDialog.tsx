import { useState, useCallback } from 'react'
import type { Issue, IssuePriority } from '@dolinear/shared'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Input,
  Textarea,
  Button,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui'
import { useCreateIssue } from '@/hooks/use-issues'
import { useWorkflowStates } from '@/hooks/use-workflow-states'
import { useTeamMembers } from '@/hooks/use-teams'
import { useLabels } from '@/hooks/use-labels'

const PRIORITY_OPTIONS: { value: IssuePriority; label: string }[] = [
  { value: 0, label: 'No priority' },
  { value: 1, label: 'Urgent' },
  { value: 2, label: 'High' },
  { value: 3, label: 'Medium' },
  { value: 4, label: 'Low' },
]

interface CreateIssueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  teamId: string
  onSuccess?: (issue: Issue) => void
}

export function CreateIssueDialog({
  open,
  onOpenChange,
  workspaceId,
  teamId,
  onSuccess,
}: CreateIssueDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [workflowStateId, setWorkflowStateId] = useState<string>('')
  const [priority, setPriority] = useState<string>('0')
  const [assigneeId, setAssigneeId] = useState<string>('')
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [estimate, setEstimate] = useState('')

  const createIssue = useCreateIssue()
  const { data: workflowStates } = useWorkflowStates(workspaceId, teamId)
  const { data: members } = useTeamMembers(workspaceId, teamId)
  const { data: labels } = useLabels(workspaceId)

  const resetForm = useCallback(() => {
    setTitle('')
    setDescription('')
    setWorkflowStateId('')
    setPriority('0')
    setAssigneeId('')
    setSelectedLabelIds([])
    setDueDate('')
    setEstimate('')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    createIssue.mutate(
      {
        workspaceId,
        teamId,
        title: title.trim(),
        description: description.trim() || undefined,
        workflowStateId: workflowStateId || undefined,
        priority: Number(priority) as IssuePriority,
        assigneeId: assigneeId || undefined,
        labelIds: selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
        dueDate: dueDate || undefined,
        estimate: estimate ? Number(estimate) : undefined,
      },
      {
        onSuccess: (issue) => {
          resetForm()
          onOpenChange(false)
          onSuccess?.(issue)
        },
      },
    )
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm()
    }
    onOpenChange(nextOpen)
  }

  const toggleLabel = (labelId: string) => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId],
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogTitle>Create issue</DialogTitle>
        <DialogDescription>Create a new issue for this team.</DialogDescription>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title (required) */}
          <Input
            id="issue-title"
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Issue title"
            required
            autoFocus
          />

          {/* Description */}
          <Textarea
            id="issue-description"
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            rows={3}
          />

          {/* Two-column grid for selects */}
          <div className="grid grid-cols-2 gap-3">
            {/* Workflow State */}
            <div>
              <label
                htmlFor="issue-state"
                className="block text-sm text-gray-400 mb-1"
              >
                Status
              </label>
              <Select
                value={workflowStateId}
                onValueChange={setWorkflowStateId}
              >
                <SelectTrigger id="issue-state">
                  <SelectValue placeholder="Backlog" />
                </SelectTrigger>
                <SelectContent>
                  {workflowStates?.map((state) => (
                    <SelectItem key={state.id} value={state.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: state.color }}
                        />
                        {state.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div>
              <label
                htmlFor="issue-priority"
                className="block text-sm text-gray-400 mb-1"
              >
                Priority
              </label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="issue-priority">
                  <SelectValue placeholder="No priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignee */}
            <div>
              <label
                htmlFor="issue-assignee"
                className="block text-sm text-gray-400 mb-1"
              >
                Assignee
              </label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger id="issue-assignee">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {members?.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Labels (multi-select via checkboxes) */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Labels</label>
              <div className="rounded border border-gray-700 bg-[#1a1a2e] max-h-[120px] overflow-y-auto">
                {labels && labels.length > 0 ? (
                  labels.map((label) => (
                    <label
                      key={label.id}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-[#16162a] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedLabelIds.includes(label.id)}
                        onChange={() => toggleLabel(label.id)}
                        className="rounded border-gray-600 bg-[#0f0f23] text-indigo-500 focus:ring-indigo-500"
                      />
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      {label.name}
                    </label>
                  ))
                ) : (
                  <span className="block px-3 py-1.5 text-sm text-gray-500">
                    No labels
                  </span>
                )}
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label
                htmlFor="issue-due-date"
                className="block text-sm text-gray-400 mb-1"
              >
                Due date
              </label>
              <input
                id="issue-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-9 px-3 py-2 rounded border border-gray-700 bg-[#1a1a2e] text-sm text-gray-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Estimate */}
            <div>
              <Input
                id="issue-estimate"
                label="Estimate"
                type="number"
                min={0}
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                placeholder="Points"
              />
            </div>
          </div>

          {/* Error display */}
          {createIssue.error && (
            <p className="text-sm text-red-400">{createIssue.error.message}</p>
          )}

          {/* Actions */}
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
              disabled={!title.trim() || createIssue.isPending}
            >
              {createIssue.isPending ? 'Creating...' : 'Create issue'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
