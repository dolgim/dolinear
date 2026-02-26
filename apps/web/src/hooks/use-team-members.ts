import { useQuery } from '@tanstack/react-query'
import type { ApiResponse } from '@dolinear/shared'
import { apiClient } from '@/lib/api-client'

export interface TeamMemberWithUser {
  id: string
  teamId: string
  userId: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    email: string
    image: string | null
  }
}

export function useTeamMembers(workspaceId: string, teamId: string) {
  return useQuery({
    queryKey: ['teamMembers', teamId],
    queryFn: () =>
      apiClient
        .get<
          ApiResponse<TeamMemberWithUser[]>
        >(`/workspaces/${workspaceId}/teams/${teamId}/members`)
        .then((r) => r.data),
    enabled: !!workspaceId && !!teamId,
  })
}
