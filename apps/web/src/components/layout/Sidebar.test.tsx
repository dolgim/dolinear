import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/test-utils'
import { Sidebar } from './Sidebar'

vi.mock('@/lib/auth', () => ({
  authClient: {
    signOut: vi.fn().mockResolvedValue({}),
  },
}))

const mockNavigate = vi.fn()
let mockParams: Record<string, string> = {}

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
    Link: (props: Record<string, unknown>) => {
      const { children, activeProps, to, params, ...rest } = props
      void activeProps
      void to
      void params
      return <a {...rest}>{children as React.ReactNode}</a>
    },
  }
})

const mockWorkspaces = [
  {
    id: 'ws-1',
    name: 'My Workspace',
    slug: 'my-workspace',
    ownerId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'ws-2',
    name: 'Other Workspace',
    slug: 'other-workspace',
    ownerId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const mockTeams = [
  {
    id: 'team-1',
    name: 'Engineering',
    identifier: 'ENG',
    workspaceId: 'ws-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'team-2',
    name: 'Design',
    identifier: 'DES',
    workspaceId: 'ws-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

let workspacesData: typeof mockWorkspaces | undefined = mockWorkspaces
let teamsData: typeof mockTeams | undefined = mockTeams

vi.mock('@/hooks/use-workspaces', () => ({
  useWorkspaces: () => ({ data: workspacesData }),
}))

vi.mock('@/hooks/use-teams', () => ({
  useTeams: () => ({ data: teamsData }),
}))

describe('Sidebar', () => {
  const defaultProps = {
    collapsed: false,
    onToggle: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockParams = { workspaceSlug: 'my-workspace' }
    workspacesData = mockWorkspaces
    teamsData = mockTeams
  })

  describe('rendering', () => {
    it('renders sidebar with workspace switcher', () => {
      render(<Sidebar {...defaultProps} />)

      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
      expect(screen.getByTestId('workspace-switcher')).toBeInTheDocument()
      expect(screen.getByText('My Workspace')).toBeInTheDocument()
    })

    it('renders My Issues link', () => {
      render(<Sidebar {...defaultProps} />)

      expect(screen.getByText('My Issues')).toBeInTheDocument()
    })

    it('renders team list', () => {
      render(<Sidebar {...defaultProps} />)

      expect(screen.getByText('Engineering')).toBeInTheDocument()
      expect(screen.getByText('Design')).toBeInTheDocument()
    })

    it('renders DOLinear when no workspace is selected', () => {
      mockParams = {}
      render(<Sidebar {...defaultProps} />)

      expect(screen.getByText('DOLinear')).toBeInTheDocument()
    })

    it('renders logout button', () => {
      render(<Sidebar {...defaultProps} />)

      expect(screen.getByText('Log out')).toBeInTheDocument()
    })

    it('hides content when collapsed', () => {
      render(<Sidebar {...defaultProps} collapsed={true} />)

      expect(screen.queryByText('My Issues')).not.toBeInTheDocument()
      expect(screen.queryByText('Engineering')).not.toBeInTheDocument()
    })
  })

  describe('team expand/collapse', () => {
    it('teams are collapsed by default', () => {
      render(<Sidebar {...defaultProps} />)

      expect(screen.queryByTestId('team-links-ENG')).not.toBeInTheDocument()
      expect(screen.queryByTestId('team-links-DES')).not.toBeInTheDocument()
    })

    it('expands team on click to show sub-links', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)

      await user.click(screen.getByTestId('team-toggle-ENG'))

      const teamLinks = screen.getByTestId('team-links-ENG')
      expect(teamLinks).toBeInTheDocument()
      expect(screen.getByText('Issues')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Backlog')).toBeInTheDocument()
    })

    it('collapses team on second click', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)

      await user.click(screen.getByTestId('team-toggle-ENG'))
      expect(screen.getByTestId('team-links-ENG')).toBeInTheDocument()

      await user.click(screen.getByTestId('team-toggle-ENG'))
      expect(screen.queryByTestId('team-links-ENG')).not.toBeInTheDocument()
    })

    it('auto-expands active team', () => {
      mockParams = {
        workspaceSlug: 'my-workspace',
        teamIdentifier: 'ENG',
      }
      render(<Sidebar {...defaultProps} />)

      expect(screen.getByTestId('team-links-ENG')).toBeInTheDocument()
      expect(screen.queryByTestId('team-links-DES')).not.toBeInTheDocument()
    })
  })

  describe('workspace switcher', () => {
    it('opens dropdown on click', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)

      await user.click(screen.getByTestId('workspace-switcher'))

      expect(screen.getByText('Other Workspace')).toBeInTheDocument()
      expect(screen.getByText('All workspaces')).toBeInTheDocument()
    })

    it('shows checkmark on current workspace', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)

      await user.click(screen.getByTestId('workspace-switcher'))

      expect(screen.getByText('✓')).toBeInTheDocument()
    })
  })

  describe('collapse toggle', () => {
    it('calls onToggle when collapse button is clicked', async () => {
      const user = userEvent.setup()
      const onToggle = vi.fn()
      render(<Sidebar {...defaultProps} onToggle={onToggle} />)

      await user.click(screen.getByLabelText('Collapse sidebar'))

      expect(onToggle).toHaveBeenCalledOnce()
    })

    it('shows expand label when collapsed', () => {
      render(<Sidebar {...defaultProps} collapsed={true} />)

      expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument()
    })
  })
})
