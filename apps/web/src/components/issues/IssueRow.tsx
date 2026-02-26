import type { Issue, WorkflowState, Label } from '@dolinear/shared'
import type { TeamMemberWithUser } from '@/hooks/use-team-members'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui'
import { PriorityIcon } from './PriorityIcon'
import { StateDropdown } from './StateDropdown'

interface IssueRowProps {
  issue: Issue
  workflowState: WorkflowState | undefined
  allStates: WorkflowState[]
  assignee: TeamMemberWithUser['user'] | undefined
  labels: Label[]
  isSelected: boolean
  onStateChange: (issueIdentifier: string, stateId: string) => void
  onClick: () => void
}

export function IssueRow({
  issue,
  workflowState,
  allStates,
  assignee,
  labels,
  isSelected,
  onStateChange,
  onClick,
}: IssueRowProps) {
  const formattedDueDate = issue.dueDate ? formatDueDate(issue.dueDate) : null

  return (
    <div
      role="row"
      tabIndex={0}
      data-testid={`issue-row-${issue.identifier}`}
      className={cn(
        'flex items-center gap-3 px-4 py-2 border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5',
        isSelected && 'bg-white/10',
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick()
      }}
    >
      {/* Priority icon */}
      <PriorityIcon priority={issue.priority} />

      {/* Identifier */}
      <span className="shrink-0 text-xs text-gray-500 w-16 font-mono">
        {issue.identifier}
      </span>

      {/* State icon with dropdown */}
      {workflowState && (
        <StateDropdown
          currentState={workflowState}
          states={allStates}
          onSelect={(stateId) => onStateChange(issue.identifier, stateId)}
        />
      )}

      {/* Title */}
      <span className="min-w-0 flex-1 truncate text-sm text-gray-100">
        {issue.title}
      </span>

      {/* Labels */}
      {labels.length > 0 && (
        <div className="flex shrink-0 items-center gap-1">
          {labels.map((label) => (
            <Badge
              key={label.id}
              className="text-[10px] px-1.5 py-0"
              style={{
                backgroundColor: `${label.color}20`,
                color: label.color,
              }}
            >
              {label.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Due date */}
      {formattedDueDate && (
        <span
          className={cn(
            'shrink-0 text-xs',
            formattedDueDate.overdue ? 'text-red-400' : 'text-gray-500',
          )}
        >
          {formattedDueDate.text}
        </span>
      )}

      {/* Assignee avatar */}
      <div className="shrink-0 w-6">
        {assignee && (
          <Avatar className="h-5 w-5">
            {assignee.image && <AvatarImage src={assignee.image} />}
            <AvatarFallback className="text-[10px]">
              {assignee.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  )
}

function formatDueDate(dateStr: string): { text: string; overdue: boolean } {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dueDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = Math.floor(
    (dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (diff < 0) return { text: `${Math.abs(diff)}d ago`, overdue: true }
  if (diff === 0) return { text: 'Today', overdue: false }
  if (diff === 1) return { text: 'Tomorrow', overdue: false }
  if (diff <= 7) return { text: `${diff}d`, overdue: false }

  return {
    text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    overdue: false,
  }
}
