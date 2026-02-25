import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiResponse, Label } from '@dolinear/shared'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'

export function useLabels(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.labels.list(workspaceId),
    queryFn: () =>
      apiClient
        .get<ApiResponse<Label[]>>(`/workspaces/${workspaceId}/labels`)
        .then((r) => r.data),
    enabled: !!workspaceId,
  })
}

export function useCreateLabel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { name: string; color: string; teamId: string }) =>
      apiClient.post<ApiResponse<Label>>('/labels', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.labels.all })
    },
  })
}
