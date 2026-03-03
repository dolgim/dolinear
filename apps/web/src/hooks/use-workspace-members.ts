import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  ApiResponse,
  WorkspaceMember,
  WorkspaceMemberRole,
  User,
} from '@dolinear/shared'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'

export interface WorkspaceMemberWithUser extends WorkspaceMember {
  user: Pick<User, 'id' | 'name' | 'email' | 'image'>
}

export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.workspaceMembers.list(workspaceId),
    queryFn: () =>
      apiClient
        .get<
          ApiResponse<WorkspaceMemberWithUser[]>
        >(`/workspaces/${workspaceId}/members`)
        .then((r) => r.data),
    enabled: !!workspaceId,
  })
}

export function useAddWorkspaceMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      workspaceId: string
      userId: string
      role: WorkspaceMemberRole
    }) =>
      apiClient
        .post<
          ApiResponse<WorkspaceMember>
        >(`/workspaces/${data.workspaceId}/members`, { userId: data.userId, role: data.role })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceMembers.all,
      })
    },
  })
}
