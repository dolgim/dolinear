import { useState } from 'react'
import type { Issue, WorkflowState, Label } from '@dolinear/shared'
import type { TeamMemberWithUser } from '@/hooks/use-team-members'
import { WorkflowStateIcon } from './WorkflowStateIcon'
import { IssueRow } from './IssueRow'

interface IssueGroupProps {
  state: WorkflowState
  issues: Issue[]
  allStates: WorkflowState[]
  members: TeamMemberWithUser[]
  labelsMap: Map<string, Label>
  issueLabelIds: Map<string, string[]>
  selectedIssueId: string | null
  onStateChange: (issueIdentifier: string, stateId: string) => void
  onIssueClick: (issue: Issue) => void
  defaultExpanded?: boolean
}

export function IssueGroup({
  state,
  issues,
  allStates,
  members,
  labelsMap,
  issueLabelIds,
  selectedIssueId,
  onStateChange,
  onIssueClick,
  defaultExpanded = true,
}: IssueGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const membersByUserId = new Map(members.map((m) => [m.userId, m.user]))

  return (
    <div data-testid={`issue-group-${state.id}`}>
      <button
        className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        data-testid={`issue-group-toggle-${state.id}`}
      >
        <span className="text-[10px] text-gray-500">
          {expanded ? '▼' : '▶'}
        </span>
        <WorkflowStateIcon type={state.type} color={state.color} />
        <span>{state.name}</span>
        <span className="text-xs text-gray-500">{issues.length}</span>
      </button>
      {expanded && (
        <div role="rowgroup">
          {issues.map((issue) => {
            const issueLabels = (issueLabelIds.get(issue.id) ?? [])
              .map((lid) => labelsMap.get(lid))
              .filter((l): l is Label => !!l)

            return (
              <IssueRow
                key={issue.id}
                issue={issue}
                workflowState={state}
                allStates={allStates}
                assignee={
                  issue.assigneeId
                    ? membersByUserId.get(issue.assigneeId)
                    : undefined
                }
                labels={issueLabels}
                isSelected={selectedIssueId === issue.id}
                onStateChange={onStateChange}
                onClick={() => onIssueClick(issue)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
