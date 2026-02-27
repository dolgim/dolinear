import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/test-utils'
import { CommentSection } from './CommentSection'
import type { Comment } from '@dolinear/shared'

const mockComments: Comment[] = [
  {
    id: 'comment-1',
    body: 'First comment with **bold**',
    issueId: 'issue-1',
    userId: 'current-user-id',
    createdAt: new Date('2026-02-25T10:00:00Z'),
    updatedAt: new Date('2026-02-25T10:00:00Z'),
  },
  {
    id: 'comment-2',
    body: 'Second comment',
    issueId: 'issue-1',
    userId: 'other-user-id',
    createdAt: new Date('2026-02-25T11:00:00Z'),
    updatedAt: new Date('2026-02-25T11:00:00Z'),
  },
]

const mockCreateMutate = vi.fn()
const mockUpdateMutate = vi.fn()
const mockDeleteMutate = vi.fn()

let mockCommentsData: Comment[] | undefined = mockComments
let mockIsLoading = false

vi.mock('@/hooks', () => ({
  useComments: () => ({
    data: mockCommentsData,
    isLoading: mockIsLoading,
  }),
  useCreateComment: () => ({
    mutate: mockCreateMutate,
    isPending: false,
  }),
  useUpdateComment: () => ({
    mutate: mockUpdateMutate,
  }),
  useDeleteComment: () => ({
    mutate: mockDeleteMutate,
  }),
}))

vi.mock('@/lib/auth', () => ({
  authClient: {
    useSession: () => ({
      data: { user: { id: 'current-user-id', name: 'Test User' } },
    }),
  },
}))

describe('CommentSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCommentsData = mockComments
    mockIsLoading = false
  })

  it('renders comment list', () => {
    render(
      <CommentSection workspaceId="ws-1" teamId="team-1" issueId="issue-1" />,
    )

    expect(screen.getByText('Comments')).toBeInTheDocument()
    expect(screen.getByTestId('comment-list')).toBeInTheDocument()
    const items = screen.getAllByTestId('comment-item')
    expect(items).toHaveLength(2)
  })

  it('renders markdown in comment body', () => {
    render(
      <CommentSection workspaceId="ws-1" teamId="team-1" issueId="issue-1" />,
    )

    const boldText = screen.getByText('bold')
    expect(boldText.tagName).toBe('STRONG')
  })

  it('shows empty state when no comments', () => {
    mockCommentsData = []

    render(
      <CommentSection workspaceId="ws-1" teamId="team-1" issueId="issue-1" />,
    )

    expect(screen.getByTestId('no-comments')).toHaveTextContent(
      'No comments yet',
    )
  })

  it('shows loading state', () => {
    mockIsLoading = true

    render(
      <CommentSection workspaceId="ws-1" teamId="team-1" issueId="issue-1" />,
    )

    expect(screen.getByText('Loading comments...')).toBeInTheDocument()
  })

  it('renders comment input form', () => {
    render(
      <CommentSection workspaceId="ws-1" teamId="team-1" issueId="issue-1" />,
    )

    expect(screen.getByTestId('comment-input')).toBeInTheDocument()
    expect(screen.getByTestId('submit-comment')).toBeInTheDocument()
    expect(screen.getByText('Cmd+Enter to submit')).toBeInTheDocument()
  })

  it('submits a comment via button click', async () => {
    const user = userEvent.setup()

    render(
      <CommentSection workspaceId="ws-1" teamId="team-1" issueId="issue-1" />,
    )

    const input = screen.getByTestId('comment-input')
    await user.type(input, 'New comment text')
    await user.click(screen.getByTestId('submit-comment'))

    expect(mockCreateMutate).toHaveBeenCalledWith(
      {
        workspaceId: 'ws-1',
        teamId: 'team-1',
        issueId: 'issue-1',
        body: 'New comment text',
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('submits a comment via Cmd+Enter', async () => {
    const user = userEvent.setup()

    render(
      <CommentSection workspaceId="ws-1" teamId="team-1" issueId="issue-1" />,
    )

    const input = screen.getByTestId('comment-input')
    await user.type(input, 'Keyboard submit')
    await user.keyboard('{Meta>}{Enter}{/Meta}')

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ body: 'Keyboard submit' }),
      expect.any(Object),
    )
  })

  it('disables submit button when input is empty', () => {
    render(
      <CommentSection workspaceId="ws-1" teamId="team-1" issueId="issue-1" />,
    )

    const submitBtn = screen.getByTestId('submit-comment')
    expect(submitBtn).toBeDisabled()
  })

  it('does not submit empty comment', async () => {
    const user = userEvent.setup()

    render(
      <CommentSection workspaceId="ws-1" teamId="team-1" issueId="issue-1" />,
    )

    const input = screen.getByTestId('comment-input')
    await user.type(input, '   ')
    await user.click(screen.getByTestId('submit-comment'))

    expect(mockCreateMutate).not.toHaveBeenCalled()
  })

  it('shows edit/delete actions only for author comments', () => {
    render(
      <CommentSection workspaceId="ws-1" teamId="team-1" issueId="issue-1" />,
    )

    const items = screen.getAllByTestId('comment-item')
    // First comment is by current-user-id (author)
    const actionButtons = items[0].querySelectorAll(
      '[data-testid="comment-actions"]',
    )
    expect(actionButtons).toHaveLength(1)

    // Second comment is by other-user-id (not author)
    const otherActionButtons = items[1].querySelectorAll(
      '[data-testid="comment-actions"]',
    )
    expect(otherActionButtons).toHaveLength(0)
  })

  it('allows inline editing of own comment', async () => {
    const user = userEvent.setup()

    render(
      <CommentSection workspaceId="ws-1" teamId="team-1" issueId="issue-1" />,
    )

    // Open dropdown for first (own) comment
    const actionBtn = screen.getAllByTestId('comment-actions')[0]
    await user.click(actionBtn)

    // Click edit
    await user.click(screen.getByTestId('edit-comment'))

    // Edit form should appear
    const editInput = screen.getByTestId('comment-edit-input')
    expect(editInput).toBeInTheDocument()
    expect(editInput).toHaveValue('First comment with **bold**')

    // Modify and save
    await user.clear(editInput)
    await user.type(editInput, 'Updated comment')
    await user.click(screen.getByTestId('save-edit'))

    expect(mockUpdateMutate).toHaveBeenCalledWith({
      workspaceId: 'ws-1',
      teamId: 'team-1',
      issueId: 'issue-1',
      commentId: 'comment-1',
      body: 'Updated comment',
    })
  })

  it('cancels editing', async () => {
    const user = userEvent.setup()

    render(
      <CommentSection workspaceId="ws-1" teamId="team-1" issueId="issue-1" />,
    )

    const actionBtn = screen.getAllByTestId('comment-actions')[0]
    await user.click(actionBtn)
    await user.click(screen.getByTestId('edit-comment'))

    const editInput = screen.getByTestId('comment-edit-input')
    await user.clear(editInput)
    await user.type(editInput, 'Should not save')
    await user.click(screen.getByTestId('cancel-edit'))

    expect(mockUpdateMutate).not.toHaveBeenCalled()
    expect(screen.queryByTestId('comment-edit-form')).not.toBeInTheDocument()
  })

  it('deletes a comment with confirmation', async () => {
    const user = userEvent.setup()

    render(
      <CommentSection workspaceId="ws-1" teamId="team-1" issueId="issue-1" />,
    )

    const actionBtn = screen.getAllByTestId('comment-actions')[0]
    await user.click(actionBtn)
    await user.click(screen.getByTestId('delete-comment'))

    // Confirm dialog appears
    expect(screen.getByTestId('delete-confirm')).toBeInTheDocument()
    expect(screen.getByText('Delete this comment?')).toBeInTheDocument()

    // Confirm delete
    await user.click(screen.getByTestId('confirm-delete'))

    expect(mockDeleteMutate).toHaveBeenCalledWith({
      workspaceId: 'ws-1',
      teamId: 'team-1',
      issueId: 'issue-1',
      commentId: 'comment-1',
    })
  })

  it('cancels comment deletion', async () => {
    const user = userEvent.setup()

    render(
      <CommentSection workspaceId="ws-1" teamId="team-1" issueId="issue-1" />,
    )

    const actionBtn = screen.getAllByTestId('comment-actions')[0]
    await user.click(actionBtn)
    await user.click(screen.getByTestId('delete-comment'))

    // Cancel delete
    await user.click(screen.getByTestId('cancel-delete'))

    expect(mockDeleteMutate).not.toHaveBeenCalled()
    expect(screen.queryByTestId('delete-confirm')).not.toBeInTheDocument()
  })
})
