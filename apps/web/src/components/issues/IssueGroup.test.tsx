import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/test-utils'
import { IssueGroup } from './IssueGroup'
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

const mockAllStates: WorkflowState[] = [mockState]

const mockIssues: Issue[] = [
  {
    id: 'issue-1',
    teamId: 'team-1',
    number: 1,
    identifier: 'DOL-1',
    title: 'First issue',
    description: null,
    workflowStateId: 'state-1',
    priority: 0,
    assigneeId: null,
    creatorId: 'user-1',
    dueDate: null,
    estimate: null,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'issue-2',
    teamId: 'team-1',
    number: 2,
    identifier: 'DOL-2',
    title: 'Second issue',
    description: null,
    workflowStateId: 'state-1',
    priority: 1,
    assigneeId: null,
    creatorId: 'user-1',
    dueDate: null,
    estimate: null,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

describe('IssueGroup', () => {
  const defaultProps = {
    state: mockState,
    issues: mockIssues,
    allStates: mockAllStates,
    members: [],
    labelsMap: new Map(),
    issueLabelIds: new Map<string, string[]>(),
    selectedIssueId: null,
    onStateChange: vi.fn(),
    onIssueClick: vi.fn(),
    defaultExpanded: true,
  }

  it('renders group header with state name and issue count', () => {
    render(<IssueGroup {...defaultProps} />)
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders all issues when expanded', () => {
    render(<IssueGroup {...defaultProps} />)
    expect(screen.getByText('First issue')).toBeInTheDocument()
    expect(screen.getByText('Second issue')).toBeInTheDocument()
  })

  it('hides issues when collapsed', async () => {
    const user = userEvent.setup()
    render(<IssueGroup {...defaultProps} />)

    // Click toggle to collapse
    await user.click(screen.getByTestId(`issue-group-toggle-${mockState.id}`))

    expect(screen.queryByText('First issue')).not.toBeInTheDocument()
    expect(screen.queryByText('Second issue')).not.toBeInTheDocument()
  })

  it('starts collapsed when defaultExpanded is false', () => {
    render(<IssueGroup {...defaultProps} defaultExpanded={false} />)
    expect(screen.queryByText('First issue')).not.toBeInTheDocument()
  })

  it('toggles expand/collapse on header click', async () => {
    const user = userEvent.setup()
    render(<IssueGroup {...defaultProps} />)

    // Collapse
    await user.click(screen.getByTestId(`issue-group-toggle-${mockState.id}`))
    expect(screen.queryByText('First issue')).not.toBeInTheDocument()

    // Expand
    await user.click(screen.getByTestId(`issue-group-toggle-${mockState.id}`))
    expect(screen.getByText('First issue')).toBeInTheDocument()
  })
})
