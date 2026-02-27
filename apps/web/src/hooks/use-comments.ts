import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiResponse, Comment } from '@dolinear/shared'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'

function commentsBasePath(
  workspaceId: string,
  teamId: string,
  issueId: string,
) {
  return `/workspaces/${workspaceId}/teams/${teamId}/issues/${issueId}/comments`
}

export function useComments(
  workspaceId: string,
  teamId: string,
  issueId: string,
) {
  return useQuery({
    queryKey: queryKeys.comments.list(issueId),
    queryFn: () =>
      apiClient
        .get<
          ApiResponse<Comment[]>
        >(commentsBasePath(workspaceId, teamId, issueId))
        .then((r) => r.data),
    enabled: !!workspaceId && !!teamId && !!issueId,
  })
}

export function useCreateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      workspaceId: string
      teamId: string
      issueId: string
      body: string
    }) =>
      apiClient
        .post<
          ApiResponse<Comment>
        >(commentsBasePath(data.workspaceId, data.teamId, data.issueId), { body: data.body })
        .then((r) => r.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.list(variables.issueId),
      })
    },
  })
}

export function useUpdateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      workspaceId: string
      teamId: string
      issueId: string
      commentId: string
      body: string
    }) =>
      apiClient
        .patch<
          ApiResponse<Comment>
        >(`${commentsBasePath(data.workspaceId, data.teamId, data.issueId)}/${data.commentId}`, { body: data.body })
        .then((r) => r.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.list(variables.issueId),
      })
    },
  })
}

export function useDeleteComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      workspaceId: string
      teamId: string
      issueId: string
      commentId: string
    }) =>
      apiClient.del<{ message: string }>(
        `${commentsBasePath(data.workspaceId, data.teamId, data.issueId)}/${data.commentId}`,
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.list(variables.issueId),
      })
    },
  })
}
