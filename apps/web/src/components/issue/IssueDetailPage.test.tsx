import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/test-utils'
import { IssueDetailPage } from './IssueDetailPage'
import type { Workspace, Team } from '@dolinear/shared'
import type { IssueWithLabels } from '@/hooks'

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    Link: ({
      children,
      to,
      params,
      className,
    }: {
      children: React.ReactNode
      to: string
      params?: Record<string, string>
      className?: string
    }) => {
      const href = params
        ? Object.entries(params).reduce(
            (path, [key, value]) => path.replace(`$${key}`, value),
            to,
          )
        : to
      return (
        <a href={href} className={className}>
          {children}
        </a>
      )
    },
  }
})

const mockIssue: IssueWithLabels = {
  id: 'issue-1',
  teamId: 'team-1',
  number: 42,
  identifier: 'ENG-42',
  title: 'Fix login bug',
  description: '## Description\n\nThis is a **bold** description.',
  workflowStateId: 'state-2',
  priority: 2,
  assigneeId: null,
  creatorId: 'user-1',
  dueDate: '2026-03-15T00:00:00.000Z',
  estimate: 3,
  sortOrder: -1,
  createdAt: '2026-02-20T00:00:00.000Z',
  updatedAt: '2026-02-25T00:00:00.000Z',
  labels: [
    { id: 'label-1', name: 'Bug', color: '#ef4444' },
    { id: 'label-2', name: 'Frontend', color: '#3b82f6' },
  ],
}

const mockWorkflowStates = [
  {
    id: 'state-1',
    name: 'Backlog',
    type: 'backlog' as const,
    color: '#bec2c8',
    position: 0,
    teamId: 'team-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'state-2',
    name: 'In Progress',
    type: 'started' as const,
    color: '#f2c94c',
    position: 2,
    teamId: 'team-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'state-3',
    name: 'Done',
    type: 'completed' as const,
    color: '#4cb782',
    position: 4,
    teamId: 'team-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const mockUpdateMutate = vi.fn()

vi.mock('@/hooks', () => ({
  useIssueByIdentifier: () => ({
    data: mockIssue,
    isLoading: false,
    error: null,
  }),
  useUpdateIssue: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
  useWorkflowStates: () => ({
    data: mockWorkflowStates,
  }),
}))

const workspace: Workspace = {
  id: 'ws-1',
  name: 'My Workspace',
  slug: 'my-workspace',
  ownerId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const team: Team = {
  id: 'team-1',
  name: 'Engineering',
  identifier: 'ENG',
  issueCounter: 42,
  workspaceId: 'ws-1',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('IssueDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders issue title', () => {
    render(
      <IssueDetailPage
        workspace={workspace}
        team={team}
        issueIdentifier="ENG-42"
      />,
    )

    expect(screen.getByTestId('issue-title')).toHaveTextContent('Fix login bug')
  })

  it('renders breadcrumb navigation', () => {
    render(
      <IssueDetailPage
        workspace={workspace}
        team={team}
        issueIdentifier="ENG-42"
      />,
    )

    expect(screen.getByText('My Workspace')).toBeInTheDocument()
    expect(screen.getByText('Engineering')).toBeInTheDocument()
    expect(screen.getByText('ENG-42')).toBeInTheDocument()
  })

  it('renders markdown description', () => {
    render(
      <IssueDetailPage
        workspace={workspace}
        team={team}
        issueIdentifier="ENG-42"
      />,
    )

    expect(screen.getByText('Description')).toBeInTheDocument()
    const boldText = screen.getByText('bold')
    expect(boldText.tagName).toBe('STRONG')
  })

  it('renders metadata sidebar', () => {
    render(
      <IssueDetailPage
        workspace={workspace}
        team={team}
        issueIdentifier="ENG-42"
      />,
    )

    const sidebar = screen.getByTestId('issue-metadata')
    expect(sidebar).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Priority')).toBeInTheDocument()
    expect(screen.getByText('Assignee')).toBeInTheDocument()
    expect(screen.getByText('Labels')).toBeInTheDocument()
    expect(screen.getByText('Due date')).toBeInTheDocument()
    expect(screen.getByText('Estimate')).toBeInTheDocument()
  })

  it('renders issue labels', () => {
    render(
      <IssueDetailPage
        workspace={workspace}
        team={team}
        issueIdentifier="ENG-42"
      />,
    )

    expect(screen.getByText('Bug')).toBeInTheDocument()
    expect(screen.getByText('Frontend')).toBeInTheDocument()
  })

  it('renders workflow state in metadata', () => {
    render(
      <IssueDetailPage
        workspace={workspace}
        team={team}
        issueIdentifier="ENG-42"
      />,
    )

    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('renders comment placeholder', () => {
    render(
      <IssueDetailPage
        workspace={workspace}
        team={team}
        issueIdentifier="ENG-42"
      />,
    )

    expect(screen.getByText('Comments')).toBeInTheDocument()
    expect(
      screen.getByText('Comments will be available soon.'),
    ).toBeInTheDocument()
  })

  it('allows inline title editing', async () => {
    const user = userEvent.setup()

    render(
      <IssueDetailPage
        workspace={workspace}
        team={team}
        issueIdentifier="ENG-42"
      />,
    )

    const title = screen.getByTestId('issue-title')
    await user.click(title)

    const input = screen.getByTestId('issue-title-input')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('Fix login bug')

    await user.clear(input)
    await user.type(input, 'Updated title')
    await user.keyboard('{Enter}')

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'ws-1',
        teamId: 'team-1',
        identifier: 'ENG-42',
        title: 'Updated title',
      }),
    )
  })

  it('cancels title edit on Escape', async () => {
    const user = userEvent.setup()

    render(
      <IssueDetailPage
        workspace={workspace}
        team={team}
        issueIdentifier="ENG-42"
      />,
    )

    await user.click(screen.getByTestId('issue-title'))

    const input = screen.getByTestId('issue-title-input')
    await user.clear(input)
    await user.type(input, 'Should not save')
    await user.keyboard('{Escape}')

    expect(mockUpdateMutate).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.getByTestId('issue-title')).toHaveTextContent(
        'Fix login bug',
      )
    })
  })

  it('renders due date and estimate values', () => {
    render(
      <IssueDetailPage
        workspace={workspace}
        team={team}
        issueIdentifier="ENG-42"
      />,
    )

    const dueDateInput = screen.getByTestId(
      'due-date-input',
    ) as HTMLInputElement
    expect(dueDateInput.value).toBe('2026-03-15')

    const estimateInput = screen.getByTestId(
      'estimate-input',
    ) as HTMLInputElement
    expect(estimateInput.value).toBe('3')
  })
})
