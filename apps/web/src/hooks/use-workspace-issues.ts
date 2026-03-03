import { useQuery } from '@tanstack/react-query'
import type {
  PaginatedResponse,
  Issue,
  WorkflowStateType,
} from '@dolinear/shared'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'

export interface WorkspaceIssueWithDetails extends Issue {
  team: {
    identifier: string
    name: string
  }
  workflowState: {
    id: string
    name: string
    color: string
    type: WorkflowStateType
  }
}

export interface WorkspaceIssueListFilters {
  assigneeId?: string
  q?: string
  stateType?: WorkflowStateType
  priority?: number
  sort?: string
  order?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export function useWorkspaceIssues(
  workspaceId: string,
  filters?: WorkspaceIssueListFilters,
) {
  return useQuery({
    queryKey: queryKeys.workspaceIssues.list({
      workspaceId,
      ...filters,
    }),
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters?.assigneeId) params.set('assigneeId', filters.assigneeId)
      if (filters?.q) params.set('q', filters.q)
      if (filters?.stateType) params.set('stateType', filters.stateType)
      if (filters?.priority !== undefined)
        params.set('priority', String(filters.priority))
      if (filters?.sort) params.set('sort', filters.sort)
      if (filters?.order) params.set('order', filters.order)
      if (filters?.page) params.set('page', String(filters.page))
      if (filters?.pageSize) params.set('pageSize', String(filters.pageSize))

      const qs = params.toString()
      const path = `/workspaces/${workspaceId}/issues${qs ? `?${qs}` : ''}`
      return apiClient.get<PaginatedResponse<WorkspaceIssueWithDetails>>(path)
    },
    enabled: !!workspaceId,
  })
}
