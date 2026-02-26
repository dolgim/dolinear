import { useQuery } from '@tanstack/react-query'
import type { ApiResponse, WorkflowState } from '@dolinear/shared'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'

export function useWorkflowStates(workspaceId: string, teamId: string) {
  return useQuery({
    queryKey: queryKeys.workflowStates.list(teamId),
    queryFn: () =>
      apiClient
        .get<
          ApiResponse<WorkflowState[]>
        >(`/workspaces/${workspaceId}/teams/${teamId}/states`)
        .then((r) => r.data),
    enabled: !!workspaceId && !!teamId,
  })
}
