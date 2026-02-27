import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { Link } from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'
import type {
  IssuePriority,
  WorkflowState,
  Workspace,
  Team,
} from '@dolinear/shared'
import { PRIORITY_LABELS } from '@dolinear/shared'
import {
  useIssueByIdentifier,
  useUpdateIssue,
  useWorkflowStates,
  type IssueWithLabels,
} from '@/hooks'
import { CommentSection } from './CommentSection'
import {
  Badge,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui'

interface IssueDetailPageProps {
  workspace: Workspace
  team: Team
  issueIdentifier: string
}

export function IssueDetailPage({
  workspace,
  team,
  issueIdentifier,
}: IssueDetailPageProps) {
  const {
    data: issue,
    isLoading,
    error,
  } = useIssueByIdentifier(workspace.id, team.id, issueIdentifier)
  const { data: workflowStates } = useWorkflowStates(workspace.id, team.id)
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Loading issue...</p>
      </div>
    )
  }

  if (error || !issue) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-400">Issue not found</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Breadcrumb
        workspace={workspace}
        team={team}
        issueIdentifier={issueIdentifier}
      />
      <div className="flex flex-1 gap-0 overflow-hidden mt-4">
        <MainContent issue={issue} workspace={workspace} team={team} />
        <MetadataSidebar
          issue={issue}
          workspace={workspace}
          team={team}
          workflowStates={workflowStates ?? []}
        />
      </div>
    </div>
  )
}

function Breadcrumb({
  workspace,
  team,
  issueIdentifier,
}: {
  workspace: Workspace
  team: Team
  issueIdentifier: string
}) {
  return (
    <nav
      className="flex items-center gap-1.5 text-sm text-gray-400"
      aria-label="Breadcrumb"
    >
      <Link
        to="/workspace/$workspaceSlug/my-issues"
        params={{ workspaceSlug: workspace.slug }}
        className="hover:text-gray-200 transition-colors"
      >
        {workspace.name}
      </Link>
      <span>/</span>
      <Link
        to="/workspace/$workspaceSlug/team/$teamIdentifier/issues"
        params={{
          workspaceSlug: workspace.slug,
          teamIdentifier: team.identifier,
        }}
        className="hover:text-gray-200 transition-colors"
      >
        {team.name}
      </Link>
      <span>/</span>
      <span className="text-gray-200 font-medium">{issueIdentifier}</span>
    </nav>
  )
}

function MainContent({
  issue,
  workspace,
  team,
}: {
  issue: IssueWithLabels
  workspace: Workspace
  team: Team
}) {
  return (
    <div className="flex-1 overflow-y-auto pr-6 min-w-0">
      <InlineTitle issue={issue} workspace={workspace} team={team} />
      <DescriptionSection issue={issue} workspace={workspace} team={team} />
      <CommentSection
        workspaceId={workspace.id}
        teamId={team.id}
        issueId={issue.id}
      />
    </div>
  )
}

function InlineTitle({
  issue,
  workspace,
  team,
}: {
  issue: IssueWithLabels
  workspace: Workspace
  team: Team
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(issue.title)
  const inputRef = useRef<HTMLInputElement>(null)
  const updateIssue = useUpdateIssue()

  useEffect(() => {
    setTitle(issue.title)
  }, [issue.title])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = () => {
    const trimmed = title.trim()
    if (trimmed && trimmed !== issue.title) {
      updateIssue.mutate({
        workspaceId: workspace.id,
        teamId: team.id,
        identifier: issue.identifier,
        title: trimmed,
      })
    } else {
      setTitle(issue.title)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setTitle(issue.title)
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        data-testid="issue-title-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full bg-transparent text-2xl font-bold text-white outline-none border-b border-indigo-500 pb-1"
      />
    )
  }

  return (
    <h1
      data-testid="issue-title"
      className="text-2xl font-bold text-white cursor-pointer hover:text-gray-200 transition-colors"
      onClick={() => setIsEditing(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') setIsEditing(true)
      }}
    >
      {issue.title}
    </h1>
  )
}

function DescriptionSection({
  issue,
  workspace,
  team,
}: {
  issue: IssueWithLabels
  workspace: Workspace
  team: Team
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [description, setDescription] = useState(issue.description ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const updateIssue = useUpdateIssue()

  useEffect(() => {
    setDescription(issue.description ?? '')
  }, [issue.description])

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isEditing])

  const handleSave = () => {
    const newDesc = description.trim() || null
    if (newDesc !== (issue.description ?? null)) {
      updateIssue.mutate({
        workspaceId: workspace.id,
        teamId: team.id,
        identifier: issue.identifier,
        description: newDesc,
      })
    }
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="mt-6">
        <textarea
          ref={textareaRef}
          data-testid="issue-description-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleSave}
          className="w-full min-h-[200px] bg-[#0f0f23] border border-gray-700 rounded p-3 text-gray-200 text-sm focus:outline-none focus:border-indigo-500 resize-y"
          placeholder="Add a description (Markdown supported)..."
        />
        <p className="text-xs text-gray-500 mt-1">
          Markdown supported. Click outside to save.
        </p>
      </div>
    )
  }

  return (
    <div
      className="mt-6 cursor-pointer group"
      onClick={() => setIsEditing(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') setIsEditing(true)
      }}
      data-testid="issue-description"
    >
      {issue.description ? (
        <div className="prose prose-invert prose-sm max-w-none text-gray-300 group-hover:text-gray-200 transition-colors">
          <ReactMarkdown>{issue.description}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-gray-500 text-sm italic">Add a description...</p>
      )}
    </div>
  )
}

function MetadataSidebar({
  issue,
  workspace,
  team,
  workflowStates,
}: {
  issue: IssueWithLabels
  workspace: Workspace
  team: Team
  workflowStates: WorkflowState[]
}) {
  const updateIssue = useUpdateIssue()

  const handleWorkflowStateChange = (stateId: string) => {
    updateIssue.mutate({
      workspaceId: workspace.id,
      teamId: team.id,
      identifier: issue.identifier,
      workflowStateId: stateId,
    })
  }

  const handlePriorityChange = (priority: string) => {
    updateIssue.mutate({
      workspaceId: workspace.id,
      teamId: team.id,
      identifier: issue.identifier,
      priority: Number(priority) as IssuePriority,
    })
  }

  const handleAssigneeChange = (assigneeId: string) => {
    updateIssue.mutate({
      workspaceId: workspace.id,
      teamId: team.id,
      identifier: issue.identifier,
      assigneeId: assigneeId === 'unassigned' ? null : assigneeId,
    })
  }

  const handleDueDateChange = (date: string) => {
    updateIssue.mutate({
      workspaceId: workspace.id,
      teamId: team.id,
      identifier: issue.identifier,
      dueDate: date || null,
    })
  }

  const handleEstimateChange = (estimate: string) => {
    updateIssue.mutate({
      workspaceId: workspace.id,
      teamId: team.id,
      identifier: issue.identifier,
      estimate: estimate ? Number(estimate) : null,
    })
  }

  const currentState = workflowStates.find(
    (s) => s.id === issue.workflowStateId,
  )

  return (
    <aside
      className="w-[280px] shrink-0 border-l border-white/10 pl-6 overflow-y-auto"
      data-testid="issue-metadata"
    >
      <div className="space-y-5">
        {/* Workflow State */}
        <MetadataField label="Status">
          <Select
            value={issue.workflowStateId}
            onValueChange={handleWorkflowStateChange}
          >
            <SelectTrigger className="h-8 text-xs" data-testid="status-select">
              <SelectValue>
                {currentState && (
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: currentState.color }}
                    />
                    {currentState.name}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {workflowStates.map((state) => (
                <SelectItem key={state.id} value={state.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: state.color }}
                    />
                    {state.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </MetadataField>

        {/* Priority */}
        <MetadataField label="Priority">
          <Select
            value={String(issue.priority)}
            onValueChange={handlePriorityChange}
          >
            <SelectTrigger
              className="h-8 text-xs"
              data-testid="priority-select"
            >
              <SelectValue>{PRIORITY_LABELS[issue.priority]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {([0, 1, 2, 3, 4] as IssuePriority[]).map((p) => (
                <SelectItem key={p} value={String(p)}>
                  <PriorityDisplay priority={p} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </MetadataField>

        {/* Assignee */}
        <MetadataField label="Assignee">
          <Select
            value={issue.assigneeId ?? 'unassigned'}
            onValueChange={handleAssigneeChange}
          >
            <SelectTrigger
              className="h-8 text-xs"
              data-testid="assignee-select"
            >
              <SelectValue>
                {issue.assigneeId ? 'Assigned' : 'Unassigned'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>
        </MetadataField>

        {/* Labels */}
        <MetadataField label="Labels">
          {issue.labels && issue.labels.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {issue.labels.map((l) => (
                <Badge
                  key={l.id}
                  className="text-xs"
                  style={{
                    backgroundColor: `${l.color}20`,
                    color: l.color,
                  }}
                >
                  {l.name}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-xs text-gray-500">No labels</span>
          )}
        </MetadataField>

        {/* Due Date */}
        <MetadataField label="Due date">
          <input
            type="date"
            data-testid="due-date-input"
            value={issue.dueDate ? issue.dueDate.split('T')[0] : ''}
            onChange={(e) => handleDueDateChange(e.target.value)}
            className="w-full h-8 bg-[#1a1a2e] border border-gray-700 rounded px-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
          />
        </MetadataField>

        {/* Estimate */}
        <MetadataField label="Estimate">
          <input
            type="number"
            data-testid="estimate-input"
            min={0}
            value={issue.estimate ?? ''}
            onChange={(e) => handleEstimateChange(e.target.value)}
            placeholder="No estimate"
            className="w-full h-8 bg-[#1a1a2e] border border-gray-700 rounded px-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
          />
        </MetadataField>
      </div>
    </aside>
  )
}

function MetadataField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

const PRIORITY_ICONS: Record<IssuePriority, string> = {
  0: '---',
  1: '!!!',
  2: '!!',
  3: '!',
  4: '...',
}

function PriorityDisplay({ priority }: { priority: IssuePriority }) {
  return (
    <span className="flex items-center gap-2">
      <span className="text-xs font-mono text-gray-400">
        {PRIORITY_ICONS[priority]}
      </span>
      <span className="capitalize">{PRIORITY_LABELS[priority]}</span>
    </span>
  )
}
