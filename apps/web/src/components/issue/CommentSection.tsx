import {
  useState,
  useRef,
  useEffect,
  type KeyboardEvent,
  type FormEvent,
} from 'react'
import ReactMarkdown from 'react-markdown'
import type { Comment } from '@dolinear/shared'
import {
  useComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from '@/hooks'
import { authClient } from '@/lib/auth'
import {
  Avatar,
  AvatarFallback,
  Button,
  IconButton,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui'

interface CommentSectionProps {
  workspaceId: string
  teamId: string
  issueId: string
}

export function CommentSection({
  workspaceId,
  teamId,
  issueId,
}: CommentSectionProps) {
  const { data: comments, isLoading } = useComments(
    workspaceId,
    teamId,
    issueId,
  )

  return (
    <div
      className="mt-8 pt-6 border-t border-white/10"
      data-testid="comment-section"
    >
      <h3 className="text-sm font-medium text-gray-400 mb-4">Comments</h3>
      {isLoading ? (
        <p className="text-sm text-gray-500">Loading comments...</p>
      ) : (
        <>
          <CommentList
            comments={comments ?? []}
            workspaceId={workspaceId}
            teamId={teamId}
            issueId={issueId}
          />
          <CommentInput
            workspaceId={workspaceId}
            teamId={teamId}
            issueId={issueId}
          />
        </>
      )}
    </div>
  )
}

function CommentList({
  comments,
  workspaceId,
  teamId,
  issueId,
}: {
  comments: Comment[]
  workspaceId: string
  teamId: string
  issueId: string
}) {
  if (comments.length === 0) {
    return (
      <p
        className="text-sm text-gray-500 italic mb-4"
        data-testid="no-comments"
      >
        No comments yet
      </p>
    )
  }

  return (
    <div className="space-y-4 mb-4" data-testid="comment-list">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          workspaceId={workspaceId}
          teamId={teamId}
          issueId={issueId}
        />
      ))}
    </div>
  )
}

function CommentItem({
  comment,
  workspaceId,
  teamId,
  issueId,
}: {
  comment: Comment
  workspaceId: string
  teamId: string
  issueId: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editBody, setEditBody] = useState(comment.body)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)
  const updateComment = useUpdateComment()
  const deleteComment = useDeleteComment()
  const { data: session } = authClient.useSession()
  const currentUserId = session?.user?.id

  const isAuthor = currentUserId === comment.userId

  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.focus()
    }
  }, [isEditing])

  const handleSave = () => {
    const trimmed = editBody.trim()
    if (trimmed && trimmed !== comment.body) {
      updateComment.mutate({
        workspaceId,
        teamId,
        issueId,
        commentId: comment.id,
        body: trimmed,
      })
    } else {
      setEditBody(comment.body)
    }
    setIsEditing(false)
  }

  const handleEditKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      setEditBody(comment.body)
      setIsEditing(false)
    }
  }

  const handleDelete = () => {
    deleteComment.mutate({
      workspaceId,
      teamId,
      issueId,
      commentId: comment.id,
    })
    setShowDeleteConfirm(false)
  }

  const timeAgo = formatTimeAgo(new Date(comment.createdAt))
  const initials = comment.userId.slice(0, 2).toUpperCase()

  return (
    <div className="flex gap-3 group" data-testid="comment-item">
      <Avatar className="h-7 w-7 mt-0.5 shrink-0">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-300">
            {comment.userId.slice(0, 8)}
          </span>
          <span className="text-xs text-gray-500" data-testid="comment-time">
            {timeAgo}
          </span>
          {isAuthor && !isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton
                  size="sm"
                  className="opacity-0 group-hover:opacity-100"
                  aria-label="Comment actions"
                  data-testid="comment-actions"
                >
                  <MoreIcon />
                </IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setEditBody(comment.body)
                    setIsEditing(true)
                  }}
                  data-testid="edit-comment"
                >
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-400"
                  onClick={() => setShowDeleteConfirm(true)}
                  data-testid="delete-comment"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {isEditing ? (
          <div data-testid="comment-edit-form">
            <textarea
              ref={editTextareaRef}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              onKeyDown={handleEditKeyDown}
              className="w-full min-h-[60px] bg-[#0f0f23] border border-gray-700 rounded p-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 resize-y"
              data-testid="comment-edit-input"
            />
            <div className="flex gap-2 mt-1">
              <Button size="sm" onClick={handleSave} data-testid="save-edit">
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditBody(comment.body)
                  setIsEditing(false)
                }}
                data-testid="cancel-edit"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none text-gray-300">
            <ReactMarkdown>{comment.body}</ReactMarkdown>
          </div>
        )}

        {showDeleteConfirm && (
          <div
            className="flex items-center gap-2 mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded"
            data-testid="delete-confirm"
          >
            <span className="text-sm text-red-400">Delete this comment?</span>
            <Button
              size="sm"
              variant="danger"
              onClick={handleDelete}
              data-testid="confirm-delete"
            >
              Delete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowDeleteConfirm(false)}
              data-testid="cancel-delete"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function CommentInput({
  workspaceId,
  teamId,
  issueId,
}: {
  workspaceId: string
  teamId: string
  issueId: string
}) {
  const [body, setBody] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const createComment = useCreateComment()

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) return

    createComment.mutate(
      { workspaceId, teamId, issueId, body: trimmed },
      {
        onSuccess: () => {
          setBody('')
        },
      },
    )
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <form onSubmit={handleSubmit} data-testid="comment-form">
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write a comment..."
        className="w-full min-h-[80px] bg-[#0f0f23] border border-gray-700 rounded p-3 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 resize-y"
        data-testid="comment-input"
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-500">Cmd+Enter to submit</span>
        <Button
          type="submit"
          size="sm"
          disabled={!body.trim() || createComment.isPending}
          data-testid="submit-comment"
        >
          {createComment.isPending ? 'Posting...' : 'Comment'}
        </Button>
      </div>
    </form>
  )
}

function MoreIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="4" cy="8" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="12" cy="8" r="1.5" />
    </svg>
  )
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 30) return `${diffDay}d ago`

  return date.toLocaleDateString()
}
