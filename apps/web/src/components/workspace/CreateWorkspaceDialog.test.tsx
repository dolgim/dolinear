import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@/test/test-utils'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog'

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

describe('CreateWorkspaceDialog', () => {
  it('renders dialog when open', () => {
    render(<CreateWorkspaceDialog open={true} onOpenChange={() => {}} />)
    expect(screen.getByText('Create workspace')).toBeInTheDocument()
    expect(screen.getByLabelText('Workspace name')).toBeInTheDocument()
  })

  it('does not render dialog when closed', () => {
    render(<CreateWorkspaceDialog open={false} onOpenChange={() => {}} />)
    expect(screen.queryByText('Create workspace')).not.toBeInTheDocument()
  })

  it('shows slug preview when typing name', async () => {
    const user = userEvent.setup()
    render(<CreateWorkspaceDialog open={true} onOpenChange={() => {}} />)

    await user.type(screen.getByLabelText('Workspace name'), 'My Project')
    expect(screen.getByText('my-project')).toBeInTheDocument()
  })

  it('calls createWorkspace mutation on submit', async () => {
    const user = userEvent.setup()
    const newWorkspace = {
      id: '1',
      name: 'My Project',
      slug: 'my-project',
      ownerId: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    fetchMock.mockResolvedValue(jsonResponse({ data: newWorkspace }))

    const onSuccess = vi.fn()
    render(
      <CreateWorkspaceDialog
        open={true}
        onOpenChange={() => {}}
        onSuccess={onSuccess}
      />,
    )

    await user.type(screen.getByLabelText('Workspace name'), 'My Project')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/workspaces',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'My Project', slug: 'my-project' }),
        }),
      )
    })

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(newWorkspace)
    })
  })

  it('shows error message on failure', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: 'Conflict',
          message: 'Workspace slug already exists',
          statusCode: 409,
        },
        409,
      ),
    )

    render(<CreateWorkspaceDialog open={true} onOpenChange={() => {}} />)

    await user.type(screen.getByLabelText('Workspace name'), 'Duplicate')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(
        screen.getByText('Workspace slug already exists'),
      ).toBeInTheDocument()
    })
  })

  it('disables submit button when name is empty', () => {
    render(<CreateWorkspaceDialog open={true} onOpenChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled()
  })
})
