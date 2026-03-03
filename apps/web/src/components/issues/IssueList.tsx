import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import type { Issue, WorkflowState, PaginatedResponse } from '@dolinear/shared'
import {
  useIssues,
  useUpdateIssue,
  hasActiveFilters,
  type IssueListFilters,
} from '@/hooks/use-issues'
import { useWorkflowStates } from '@/hooks/use-workflow-states'
import { useTeamMembers } from '@/hooks/use-team-members'
import { useLabels } from '@/hooks/use-labels'
import { queryKeys } from '@/lib/query-keys'
import { FilterBar } from './FilterBar'
import { IssueGroup } from './IssueGroup'
import { IssueListSkeleton } from './IssueListSkeleton'
import { EmptyState } from './EmptyState'

interface IssueListProps {
  workspaceId: string
  workspaceSlug: string
  teamId: string
  teamIdentifier: string
}

export function IssueList({
  workspaceId,
  workspaceSlug,
  teamId,
  teamIdentifier,
}: IssueListProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const containerRef = useRef<HTMLDivElement>(null)
  const [filters, setFilters] = useState<IssueListFilters>({
    pageSize: 100,
  })
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const { data: issuesData, isLoading: issuesLoading } = useIssues(
    workspaceId,
    teamId,
    filters,
  )
  const { data: states, isLoading: statesLoading } = useWorkflowStates(
    workspaceId,
    teamId,
  )
  const { data: members } = useTeamMembers(workspaceId, teamId)
  const { data: labels } = useLabels(workspaceId)
  const updateIssue = useUpdateIssue()

  // DnD sensors with activation constraint to avoid interfering with clicks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  )

  const issues = issuesData?.data ?? []
  const isLoading = issuesLoading || statesLoading

  // Build labels map
  const labelsMap = useMemo(
    () => new Map((labels ?? []).map((l) => [l.id, l])),
    [labels],
  )

  // Group issues by workflow state, ordered by state position
  const groupedIssues = useMemo(() => {
    if (!states) return []

    const groups: { state: WorkflowState; issues: Issue[] }[] = []
    const sortedStates = [...states].sort((a, b) => a.position - b.position)

    for (const state of sortedStates) {
      const stateIssues = issues
        .filter((i) => i.workflowStateId === state.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      if (stateIssues.length > 0 || !hasActiveFilters(filters)) {
        groups.push({ state, issues: stateIssues })
      }
    }

    return groups
  }, [states, issues, filters])

  // Flat list of all visible issues for keyboard navigation
  const flatIssues = useMemo(
    () => groupedIssues.flatMap((g) => g.issues),
    [groupedIssues],
  )

  const handleStateChange = useCallback(
    (issueIdentifier: string, stateId: string) => {
      updateIssue.mutate({
        workspaceId,
        teamId,
        identifier: issueIdentifier,
        workflowStateId: stateId,
      })
    },
    [updateIssue, workspaceId, teamId],
  )

  const handleIssueClick = useCallback(
    (issue: Issue) => {
      navigate({
        to: '/workspace/$workspaceSlug/team/$teamIdentifier/issue/$issueIdentifier',
        params: {
          workspaceSlug,
          teamIdentifier,
          issueIdentifier: issue.identifier,
        },
      })
    },
    [navigate, workspaceSlug, teamIdentifier],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      // Find which group the dragged issue belongs to
      const activeIssue = issues.find((i) => i.id === active.id)
      if (!activeIssue) return

      const group = groupedIssues.find(
        (g) => g.state.id === activeIssue.workflowStateId,
      )
      if (!group) return

      const groupIssues = group.issues
      const oldIndex = groupIssues.findIndex((i) => i.id === active.id)
      const newIndex = groupIssues.findIndex((i) => i.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      // Calculate new sortOrder based on neighbors
      const reordered = [...groupIssues]
      const [moved] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, moved)

      let newSortOrder: number
      if (newIndex === 0) {
        // Moved to first position
        newSortOrder = (reordered[1]?.sortOrder ?? 0) - 1
      } else if (newIndex === reordered.length - 1) {
        // Moved to last position
        newSortOrder = (reordered[newIndex - 1]?.sortOrder ?? 0) + 1
      } else {
        // Between two items: midpoint
        const prev = reordered[newIndex - 1]!.sortOrder
        const next = reordered[newIndex + 1]!.sortOrder
        newSortOrder = (prev + next) / 2
      }

      // Optimistic update: reorder in cache
      const queryKey = queryKeys.issues.list({
        workspaceId,
        teamId,
        ...filters,
      })
      queryClient.setQueryData<PaginatedResponse<Issue>>(queryKey, (old) => {
        if (!old) return old
        return {
          ...old,
          data: old.data.map((i) =>
            i.id === active.id ? { ...i, sortOrder: newSortOrder } : i,
          ),
        }
      })

      // Persist to server
      updateIssue.mutate(
        {
          workspaceId,
          teamId,
          identifier: activeIssue.identifier,
          sortOrder: newSortOrder,
        },
        {
          onError: () => {
            // Rollback on error
            queryClient.invalidateQueries({
              queryKey: queryKeys.issues.all,
            })
          },
        },
      )
    },
    [
      issues,
      groupedIssues,
      workspaceId,
      teamId,
      filters,
      queryClient,
      updateIssue,
    ],
  )

  // Keyboard navigation: j/k to move, Enter to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, flatIssues.length - 1))
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault()
        const issue = flatIssues[selectedIndex]
        if (issue) handleIssueClick(issue)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [flatIssues, selectedIndex, handleIssueClick])

  // Scroll selected row into view
  useEffect(() => {
    if (selectedIndex < 0 || !containerRef.current) return

    const issue = flatIssues[selectedIndex]
    if (!issue) return

    const row = containerRef.current.querySelector(
      `[data-testid="issue-row-${issue.identifier}"]`,
    )
    row?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex, flatIssues])

  if (isLoading) {
    return <IssueListSkeleton />
  }

  // NOTE: issueLabelIds - we don't have label data in the list response.
  // The list endpoint doesn't return labels per issue. We pass an empty map.
  // Labels will be shown when the detail endpoint returns them.
  const issueLabelIds = new Map<string, string[]>()

  const hasFilters = hasActiveFilters(filters)
  const totalIssues = issues.length

  return (
    <div ref={containerRef} className="flex flex-col">
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        states={states ?? []}
        members={members ?? []}
        labels={labels ?? []}
      />

      {totalIssues === 0 ? (
        <EmptyState
          hasFilters={hasFilters}
          onClearFilters={() => setFilters({ pageSize: 100 })}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div role="table" aria-label="Issues">
            {groupedIssues.map((group) => (
              <IssueGroup
                key={group.state.id}
                state={group.state}
                issues={group.issues}
                allStates={states ?? []}
                members={members ?? []}
                labelsMap={labelsMap}
                issueLabelIds={issueLabelIds}
                selectedIssueId={
                  selectedIndex >= 0
                    ? (flatIssues[selectedIndex]?.id ?? null)
                    : null
                }
                onStateChange={handleStateChange}
                onIssueClick={(issue) => {
                  const idx = flatIssues.findIndex((i) => i.id === issue.id)
                  setSelectedIndex(idx)
                  handleIssueClick(issue)
                }}
              />
            ))}
          </div>
        </DndContext>
      )}
    </div>
  )
}
