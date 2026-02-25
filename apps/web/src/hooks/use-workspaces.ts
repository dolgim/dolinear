import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiResponse, Workspace } from '@dolinear/shared'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'

export function useWorkspaces() {
  return useQuery({
    queryKey: queryKeys.workspaces.all,
    queryFn: () =>
      apiClient
        .get<ApiResponse<Workspace[]>>('/workspaces')
        .then((r) => r.data),
  })
}

export function useWorkspace(id: string) {
  return useQuery({
    queryKey: queryKeys.workspaces.detail(id),
    queryFn: () =>
      apiClient
        .get<ApiResponse<Workspace>>(`/workspaces/${id}`)
        .then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { name: string; slug: string }) =>
      apiClient
        .post<ApiResponse<Workspace>>('/workspaces', data)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all })
    },
  })
}
