import type { WorkflowState, Label, IssuePriority } from '@dolinear/shared'
import { PRIORITY_LABELS } from '@dolinear/shared'
import type { TeamMemberWithUser } from '@/hooks/use-team-members'
import type { IssueListFilters } from '@/hooks/use-issues'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui'

interface FilterBarProps {
  filters: IssueListFilters
  onFiltersChange: (filters: IssueListFilters) => void
  states: WorkflowState[]
  members: TeamMemberWithUser[]
  labels: Label[]
}

export function FilterBar({
  filters,
  onFiltersChange,
  states,
  members,
  labels,
}: FilterBarProps) {
  const updateFilter = (key: string, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value === '__all__' ? undefined : value,
    })
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2" data-testid="filter-bar">
      {/* Status filter */}
      <Select
        value={filters.workflowStateId ?? '__all__'}
        onValueChange={(v) => updateFilter('workflowStateId', v)}
      >
        <SelectTrigger className="h-7 w-auto min-w-[100px] text-xs border-gray-700">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All statuses</SelectItem>
          {states.map((state) => (
            <SelectItem key={state.id} value={state.id}>
              {state.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Priority filter */}
      <Select
        value={
          filters.priority !== undefined ? String(filters.priority) : '__all__'
        }
        onValueChange={(v) =>
          updateFilter('priority', v === '__all__' ? undefined : v)
        }
      >
        <SelectTrigger className="h-7 w-auto min-w-[100px] text-xs border-gray-700">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All priorities</SelectItem>
          {([1, 2, 3, 4] as IssuePriority[]).map((p) => (
            <SelectItem key={p} value={String(p)}>
              {PRIORITY_LABELS[p].charAt(0).toUpperCase() +
                PRIORITY_LABELS[p].slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Assignee filter */}
      <Select
        value={filters.assigneeId ?? '__all__'}
        onValueChange={(v) => updateFilter('assigneeId', v)}
      >
        <SelectTrigger className="h-7 w-auto min-w-[100px] text-xs border-gray-700">
          <SelectValue placeholder="Assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All assignees</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.userId} value={m.userId}>
              {m.user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Label filter */}
      <Select
        value={filters.labelId ?? '__all__'}
        onValueChange={(v) => updateFilter('labelId', v)}
      >
        <SelectTrigger className="h-7 w-auto min-w-[100px] text-xs border-gray-700">
          <SelectValue placeholder="Label" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All labels</SelectItem>
          {labels.map((label) => (
            <SelectItem key={label.id} value={label.id}>
              {label.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear all filters */}
      {hasActiveFilters(filters) && (
        <button
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          onClick={() => onFiltersChange({})}
        >
          Clear filters
        </button>
      )}
    </div>
  )
}

function hasActiveFilters(filters: IssueListFilters): boolean {
  return !!(
    filters.workflowStateId ||
    filters.priority !== undefined ||
    filters.assigneeId ||
    filters.labelId
  )
}
