import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiResponse, Comment } from '@dolinear/shared'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'

export function useComments(issueId: string) {
  return useQuery({
    queryKey: queryKeys.comments.list(issueId),
    queryFn: () =>
      apiClient
        .get<ApiResponse<Comment[]>>(`/issues/${issueId}/comments`)
        .then((r) => r.data),
    enabled: !!issueId,
  })
}

export function useCreateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { body: string; issueId: string }) =>
      apiClient
        .post<ApiResponse<Comment>>(`/issues/${data.issueId}/comments`, {
          body: data.body,
        })
        .then((r) => r.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.list(variables.issueId),
      })
    },
  })
}
