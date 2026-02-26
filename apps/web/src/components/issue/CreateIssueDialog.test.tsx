import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@/test/test-utils'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateIssueDialog } from './CreateIssueDialog'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.restoreAllMocks()
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  workspaceId: 'ws-1',
  teamId: 'team-1',
}

const mockWorkflowStates = [
  {
    id: 'state-1',
    name: 'Backlog',
    type: 'backlog',
    color: '#94a3b8',
    position: 0,
    teamId: 'team-1',
  },
  {
    id: 'state-2',
    name: 'In Progress',
    type: 'started',
    color: '#f59e0b',
    position: 1,
    teamId: 'team-1',
  },
]

const mockMembers = [
  {
    id: 'member-1',
    teamId: 'team-1',
    userId: 'user-1',
    user: { id: 'user-1', name: 'Alice', email: 'alice@test.com', image: null },
  },
  {
    id: 'member-2',
    teamId: 'team-1',
    userId: 'user-2',
    user: { id: 'user-2', name: 'Bob', email: 'bob@test.com', image: null },
  },
]

const mockLabels = [
  { id: 'label-1', workspaceId: 'ws-1', name: 'Bug', color: '#ef4444' },
  { id: 'label-2', workspaceId: 'ws-1', name: 'Feature', color: '#3b82f6' },
]

function setupFetchMock() {
  fetchMock.mockImplementation((url: string) => {
    if (url.includes('/states')) {
      return Promise.resolve(jsonResponse({ data: mockWorkflowStates }))
    }
    if (url.includes('/members')) {
      return Promise.resolve(jsonResponse({ data: mockMembers }))
    }
    if (url.includes('/labels')) {
      return Promise.resolve(jsonResponse({ data: mockLabels }))
    }
    if (url.includes('/issues')) {
      return Promise.resolve(
        jsonResponse(
          {
            data: {
              id: 'issue-1',
              teamId: 'team-1',
              number: 1,
              identifier: 'TEAM-1',
              title: 'Test issue',
              description: null,
              workflowStateId: 'state-1',
              priority: 0,
              assigneeId: null,
              creatorId: 'user-1',
              dueDate: null,
              estimate: null,
              sortOrder: -1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
          201,
        ),
      )
    }
    return Promise.resolve(jsonResponse({ data: null }))
  })
}

describe('CreateIssueDialog', () => {
  it('renders dialog when open', () => {
    setupFetchMock()
    render(<CreateIssueDialog {...defaultProps} />)
    expect(
      screen.getByRole('heading', { name: 'Create issue' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
  })

  it('does not render dialog when closed', () => {
    setupFetchMock()
    render(<CreateIssueDialog {...defaultProps} open={false} />)
    expect(screen.queryByText('Create issue')).not.toBeInTheDocument()
  })

  it('disables submit button when title is empty', () => {
    setupFetchMock()
    render(<CreateIssueDialog {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Create issue' })).toBeDisabled()
  })

  it('enables submit button when title is entered', async () => {
    setupFetchMock()
    const user = userEvent.setup()
    render(<CreateIssueDialog {...defaultProps} />)

    await user.type(screen.getByLabelText('Title'), 'My issue')
    expect(screen.getByRole('button', { name: 'Create issue' })).toBeEnabled()
  })

  it('calls create mutation on form submit', async () => {
    setupFetchMock()
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    render(<CreateIssueDialog {...defaultProps} onSuccess={onSuccess} />)

    await user.type(screen.getByLabelText('Title'), 'New issue')
    await user.click(screen.getByRole('button', { name: 'Create issue' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/workspaces/ws-1/teams/team-1/issues',
        expect.objectContaining({
          method: 'POST',
        }),
      )
    })

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('shows error message on failure', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/issues')) {
        return Promise.resolve(
          jsonResponse(
            {
              error: 'Validation',
              message: 'Title is required',
              statusCode: 400,
            },
            400,
          ),
        )
      }
      if (url.includes('/states')) {
        return Promise.resolve(jsonResponse({ data: mockWorkflowStates }))
      }
      if (url.includes('/members')) {
        return Promise.resolve(jsonResponse({ data: mockMembers }))
      }
      if (url.includes('/labels')) {
        return Promise.resolve(jsonResponse({ data: mockLabels }))
      }
      return Promise.resolve(jsonResponse({ data: null }))
    })

    const user = userEvent.setup()
    render(<CreateIssueDialog {...defaultProps} />)

    await user.type(screen.getByLabelText('Title'), 'Test')
    await user.click(screen.getByRole('button', { name: 'Create issue' }))

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument()
    })
  })

  it('resets form when dialog is closed', async () => {
    setupFetchMock()
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<CreateIssueDialog {...defaultProps} onOpenChange={onOpenChange} />)

    await user.type(screen.getByLabelText('Title'), 'Some title')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders label checkboxes', async () => {
    setupFetchMock()
    render(<CreateIssueDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Bug')).toBeInTheDocument()
      expect(screen.getByText('Feature')).toBeInTheDocument()
    })
  })

  it('allows selecting labels', async () => {
    setupFetchMock()
    const user = userEvent.setup()
    render(<CreateIssueDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Bug')).toBeInTheDocument()
    })

    const bugLabel = screen.getByText('Bug')
    const checkbox = within(bugLabel.closest('label')!).getByRole('checkbox')
    await user.click(checkbox)
    expect(checkbox).toBeChecked()
  })
})
