import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiResponse, Team, TeamMember, User } from '@dolinear/shared'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'

export interface TeamMemberWithUser extends TeamMember {
  user: Pick<User, 'id' | 'name' | 'email' | 'image'>
}

export function useTeams(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.teams.list(workspaceId),
    queryFn: () =>
      apiClient
        .get<ApiResponse<Team[]>>(`/workspaces/${workspaceId}/teams`)
        .then((r) => r.data),
    enabled: !!workspaceId,
  })
}

export function useTeam(id: string) {
  return useQuery({
    queryKey: queryKeys.teams.detail(id),
    queryFn: () =>
      apiClient.get<ApiResponse<Team>>(`/teams/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      name: string
      identifier: string
      workspaceId: string
    }) => apiClient.post<ApiResponse<Team>>('/teams', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
    },
  })
}

export function useTeamMembers(workspaceId: string, teamId: string) {
  return useQuery({
    queryKey: queryKeys.teamMembers.list(teamId),
    queryFn: () =>
      apiClient
        .get<
          ApiResponse<TeamMemberWithUser[]>
        >(`/workspaces/${workspaceId}/teams/${teamId}/members`)
        .then((r) => r.data),
    enabled: !!workspaceId && !!teamId,
  })
}
