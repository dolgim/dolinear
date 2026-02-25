import { describe, it, expect, vi } from 'vitest'
import { render } from '@/test/test-utils'
import { screen } from '@testing-library/react'
import { WorkspaceCard } from './WorkspaceCard'

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    Link: ({
      to,
      params,
      children,
      className,
    }: {
      to: string
      params?: Record<string, string>
      children: React.ReactNode
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
