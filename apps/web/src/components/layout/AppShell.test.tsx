import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/test-utils'
import { AppShell } from './AppShell'

vi.mock('@/lib/auth', () => ({
  authClient: {
    signOut: vi.fn().mockResolvedValue({}),
    getSession: vi.fn().mockResolvedValue({ data: null }),
  },
}))

const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({}),
    Link: ({
      children,
      ...props
    }: { children: React.ReactNode } & Record<string, unknown>) => (
      <a {...props}>{children}</a>
    ),
  }
})

vi.mock('@/hooks/use-workspaces', () => ({
  useWorkspaces: () => ({ data: [] }),
}))

vi.mock('@/hooks/use-teams', () => ({
  useTeams: () => ({ data: [] }),
}))

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders sidebar and main area', () => {
    render(
      <AppShell>
        <div>Test Content</div>
      </AppShell>,
    )

    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByText('DOLinear')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('renders logout button', () => {
    render(
      <AppShell>
        <div />
      </AppShell>,
    )

    expect(screen.getByText('Log out')).toBeInTheDocument()
  })

  it('toggles sidebar collapsed state', async () => {
    const user = userEvent.setup()

    render(
      <AppShell>
        <div />
      </AppShell>,
    )

    const sidebar = screen.getByTestId('sidebar')
    expect(sidebar).toHaveClass('w-60')

    const collapseButton = screen.getByLabelText('Collapse sidebar')
    await user.click(collapseButton)

    expect(sidebar).toHaveClass('w-16')
  })

  it('calls signOut and navigates to /login on logout', async () => {
    const { authClient } = await import('@/lib/auth')
    const user = userEvent.setup()

    render(
      <AppShell>
        <div />
      </AppShell>,
    )

    await user.click(screen.getByText('Log out'))

    expect(authClient.signOut).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' })
  })

  it('renders header with skeleton placeholder', () => {
    render(
      <AppShell>
        <div />
      </AppShell>,
    )

    const header = document.querySelector('header')
    expect(header).toBeInTheDocument()
    const skeleton = header?.querySelector('.animate-pulse')
    expect(skeleton).toBeInTheDocument()
  })
})
