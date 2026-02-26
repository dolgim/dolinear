import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiResponse, Issue, IssuePriority, Label } from '@dolinear/shared'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'

export type IssueWithLabels = Issue & {
  labels: Pick<Label, 'id' | 'name' | 'color'>[]
}

export function useIssues(teamId: string) {
  return useQuery({
    queryKey: queryKeys.issues.list({ teamId }),
    queryFn: () =>
      apiClient
        .get<ApiResponse<Issue[]>>(`/teams/${teamId}/issues`)
        .then((r) => r.data),
    enabled: !!teamId,
  })
}

export function useIssue(id: string) {
  return useQuery({
    queryKey: queryKeys.issues.detail(id),
    queryFn: () =>
      apiClient.get<ApiResponse<Issue>>(`/issues/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useIssueByIdentifier(
  workspaceId: string,
  teamId: string,
  identifier: string,
) {
  return useQuery({
    queryKey: queryKeys.issues.detail(identifier),
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
    mutationFn: (data: {
      title: string
      description?: string
      teamId: string
      priority?: IssuePriority
      assigneeId?: string
      parentId?: string
    }) =>
      apiClient.post<ApiResponse<Issue>>('/issues', data).then((r) => r.data),
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
