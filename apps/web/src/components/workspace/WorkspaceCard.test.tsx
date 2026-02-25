import { describe, it, expect } from 'vitest'
import { render } from '@/test/test-utils'
import { screen } from '@testing-library/react'
import { WorkspaceCard } from './WorkspaceCard'

describe('WorkspaceCard', () => {
  const workspace = {
    id: '1',
    name: 'Test Workspace',
    slug: 'test-workspace',
    ownerId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  it('renders workspace name and slug', () => {
    render(<WorkspaceCard workspace={workspace} />)
    expect(screen.getByText('Test Workspace')).toBeInTheDocument()
    expect(screen.getByText('test-workspace')).toBeInTheDocument()
  })

  it('links to workspace page', () => {
    render(<WorkspaceCard workspace={workspace} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/workspace/test-workspace')
  })
})
