import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/test-utils'
import { IssueRow } from './IssueRow'
import type { Issue, WorkflowState } from '@dolinear/shared'

const mockState: WorkflowState = {
  id: 'state-1',
  name: 'In Progress',
  type: 'started',
  color: '#f2c94c',
  position: 2,
  teamId: 'team-1',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockStates: WorkflowState[] = [
  {
    id: 'state-0',
    name: 'Backlog',
    type: 'backlog',
    color: '#bec2c8',
    position: 0,
    teamId: 'team-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  mockState,
  {
    id: 'state-2',
    name: 'Done',
    type: 'completed',
    color: '#4cb782',
    position: 4,
    teamId: 'team-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const mockIssue: Issue = {
  id: 'issue-1',
  teamId: 'team-1',
  number: 1,
  identifier: 'DOL-1',
  title: 'Fix login bug',
  description: null,
  workflowStateId: 'state-1',
  priority: 2,
  assigneeId: 'user-1',
  creatorId: 'user-1',
  dueDate: null,
  estimate: null,
  sortOrder: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const mockAssignee = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  image: null,
}

describe('IssueRow', () => {
  const defaultProps = {
    issue: mockIssue,
    workflowState: mockState,
    allStates: mockStates,
    assignee: mockAssignee,
    labels: [],
    isSelected: false,
    onStateChange: vi.fn(),
    onClick: vi.fn(),
  }

  it('renders issue identifier and title', () => {
    render(<IssueRow {...defaultProps} />)
    expect(screen.getByText('DOL-1')).toBeInTheDocument()
    expect(screen.getByText('Fix login bug')).toBeInTheDocument()
  })

  it('renders assignee avatar', () => {
    render(<IssueRow {...defaultProps} />)
    expect(screen.getByText('J')).toBeInTheDocument()
  })

  it('renders without assignee', () => {
    render(<IssueRow {...defaultProps} assignee={undefined} />)
    expect(screen.getByText('DOL-1')).toBeInTheDocument()
    expect(screen.queryByText('J')).not.toBeInTheDocument()
  })

  it('highlights when selected', () => {
    render(<IssueRow {...defaultProps} isSelected={true} />)
    const row = screen.getByTestId('issue-row-DOL-1')
    expect(row.className).toContain('bg-white/10')
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<IssueRow {...defaultProps} onClick={onClick} />)
    await user.click(screen.getByTestId('issue-row-DOL-1'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('calls onClick on Enter key', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<IssueRow {...defaultProps} onClick={onClick} />)
    const row = screen.getByTestId('issue-row-DOL-1')
    row.focus()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders labels when provided', () => {
    const labels = [
      {
        id: 'label-1',
        workspaceId: 'ws-1',
        name: 'Bug',
        color: '#ff0000',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]
    render(<IssueRow {...defaultProps} labels={labels} />)
    expect(screen.getByText('Bug')).toBeInTheDocument()
  })

  it('renders due date when provided', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    render(
      <IssueRow
        {...defaultProps}
        issue={{ ...mockIssue, dueDate: tomorrow.toISOString() }}
      />,
    )
    expect(screen.getByText('Tomorrow')).toBeInTheDocument()
  })

  it('renders overdue date in red', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 2)

    render(
      <IssueRow
        {...defaultProps}
        issue={{ ...mockIssue, dueDate: yesterday.toISOString() }}
      />,
    )
    const dueElement = screen.getByText('2d ago')
    expect(dueElement.className).toContain('text-red-400')
  })
})
