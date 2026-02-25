import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiResponse, Issue, IssuePriority } from '@dolinear/shared'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'

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
      id,
      ...data
    }: {
      id: string
      title?: string
      description?: string | null
      status?: string
      priority?: IssuePriority
      assigneeId?: string | null
      parentId?: string | null
    }) =>
      apiClient
        .patch<ApiResponse<Issue>>(`/issues/${id}`, data)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.all })
    },
  })
}
