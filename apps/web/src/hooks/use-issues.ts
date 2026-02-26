import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  ApiResponse,
  PaginatedResponse,
  Issue,
  IssuePriority,
  Label,
} from '@dolinear/shared'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'

export type IssueWithLabels = Issue & {
  labels: Pick<Label, 'id' | 'name' | 'color'>[]
}

export interface IssueListFilters {
  workflowStateId?: string
  stateType?: string
  priority?: number
  assigneeId?: string
  labelId?: string
  sort?: string
  order?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export function hasActiveFilters(filters: IssueListFilters): boolean {
  return !!(
    filters.workflowStateId ||
    filters.priority !== undefined ||
    filters.assigneeId ||
    filters.labelId
  )
}

export function useIssues(
  workspaceId: string,
  teamId: string,
  filters?: IssueListFilters,
) {
  return useQuery({
    queryKey: queryKeys.issues.list({ workspaceId, teamId, ...filters }),
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters?.workflowStateId)
        params.set('workflowStateId', filters.workflowStateId)
      if (filters?.stateType) params.set('stateType', filters.stateType)
      if (filters?.priority !== undefined)
        params.set('priority', String(filters.priority))
      if (filters?.assigneeId) params.set('assigneeId', filters.assigneeId)
      if (filters?.labelId) params.set('labelId', filters.labelId)
      if (filters?.sort) params.set('sort', filters.sort)
      if (filters?.order) params.set('order', filters.order)
      if (filters?.page) params.set('page', String(filters.page))
      if (filters?.pageSize) params.set('pageSize', String(filters.pageSize))

      const qs = params.toString()
      const path = `/workspaces/${workspaceId}/teams/${teamId}/issues${qs ? `?${qs}` : ''}`
      return apiClient.get<PaginatedResponse<Issue>>(path)
    },
    enabled: !!workspaceId && !!teamId,
  })
}

export function useIssue(
  workspaceId: string,
  teamId: string,
  issueIdentifier: string,
) {
  return useQuery({
    queryKey: queryKeys.issues.detail(issueIdentifier),
    queryFn: () =>
      apiClient
        .get<
          ApiResponse<Issue>
        >(`/workspaces/${workspaceId}/teams/${teamId}/issues/${issueIdentifier}`)
        .then((r) => r.data),
    enabled: !!workspaceId && !!teamId && !!issueIdentifier,
  })
}

export function useIssueByIdentifier(
  workspaceId: string,
  teamId: string,
  identifier: string,
) {
  return useQuery({
    queryKey: queryKeys.issues.detailByIdentifier(identifier),
    queryFn: () =>
      apiClient
        .get<
          ApiResponse<IssueWithLabels>
        >(`/workspaces/${workspaceId}/teams/${teamId}/issues/${identifier}`)
        .then((r) => r.data),
    enabled: !!workspaceId && !!teamId && !!identifier,
  })
}

export function useCreateIssue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      workspaceId,
      teamId,
      ...data
    }: {
      workspaceId: string
      teamId: string
      title: string
      description?: string | null
      workflowStateId?: string
      priority?: IssuePriority
      assigneeId?: string | null
      dueDate?: string | null
      estimate?: number | null
      labelIds?: string[]
    }) =>
      apiClient
        .post<
          ApiResponse<Issue>
        >(`/workspaces/${workspaceId}/teams/${teamId}/issues`, data)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.all })
    },
  })
}

export function useUpdateIssue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      workspaceId,
      teamId,
      identifier,
      ...data
    }: {
      workspaceId: string
      teamId: string
      identifier: string
      title?: string
      description?: string | null
      workflowStateId?: string
      priority?: IssuePriority
      assigneeId?: string | null
      dueDate?: string | null
      estimate?: number | null
      sortOrder?: number
    }) =>
      apiClient
        .patch<
          ApiResponse<Issue>
        >(`/workspaces/${workspaceId}/teams/${teamId}/issues/${identifier}`, data)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.all })
    },
  })
}
