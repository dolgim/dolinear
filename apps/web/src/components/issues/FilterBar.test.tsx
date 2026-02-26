import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/test-utils'
import { FilterBar } from './FilterBar'
import type { WorkflowState, Label } from '@dolinear/shared'
import type { TeamMemberWithUser } from '@/hooks/use-team-members'

const mockStates: WorkflowState[] = [
  {
    id: 'state-1',
    name: 'Backlog',
    type: 'backlog',
    color: '#bec2c8',
    position: 0,
    teamId: 'team-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'state-2',
    name: 'In Progress',
    type: 'started',
    color: '#f2c94c',
    position: 2,
    teamId: 'team-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const mockMembers: TeamMemberWithUser[] = [
  {
    id: 'tm-1',
    teamId: 'team-1',
    userId: 'user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    user: { id: 'user-1', name: 'Alice', email: 'alice@test.com', image: null },
  },
]

const mockLabels: Label[] = [
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

describe('FilterBar', () => {
  const defaultProps = {
    filters: {},
    onFiltersChange: vi.fn(),
    states: mockStates,
    members: mockMembers,
    labels: mockLabels,
  }

  it('renders filter bar', () => {
    render(<FilterBar {...defaultProps} />)
    expect(screen.getByTestId('filter-bar')).toBeInTheDocument()
  })

  it('does not show clear button when no filters active', () => {
    render(<FilterBar {...defaultProps} />)
    expect(screen.queryByText('Clear filters')).not.toBeInTheDocument()
  })

  it('shows clear button when filters are active', () => {
    render(
      <FilterBar {...defaultProps} filters={{ workflowStateId: 'state-1' }} />,
    )
    expect(screen.getByText('Clear filters')).toBeInTheDocument()
  })

  it('calls onFiltersChange with empty object when clear is clicked', async () => {
    const user = userEvent.setup()
    const onFiltersChange = vi.fn()
    render(
      <FilterBar
        {...defaultProps}
        filters={{ workflowStateId: 'state-1' }}
        onFiltersChange={onFiltersChange}
      />,
    )

    await user.click(screen.getByText('Clear filters'))
    expect(onFiltersChange).toHaveBeenCalledWith({})
  })
})
