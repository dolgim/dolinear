import { useQuery } from '@tanstack/react-query'
import type { ApiResponse, WorkflowState } from '@dolinear/shared'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'

export function useWorkflowStates(teamId: string) {
  return useQuery({
    queryKey: queryKeys.workflowStates.list(teamId),
    queryFn: () =>
      apiClient
        .get<ApiResponse<WorkflowState[]>>(`/teams/${teamId}/workflow-states`)
        .then((r) => r.data),
    enabled: !!teamId,
  })
}
