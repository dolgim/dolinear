import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useWorkspaces, useCreateWorkspace } from './use-workspaces'

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

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe('useWorkspaces', () => {
  it('fetches workspaces list', async () => {
    const workspaces = [{ id: '1', name: 'My Workspace', slug: 'my-workspace' }]
    fetchMock.mockResolvedValue(jsonResponse({ data: workspaces }))

    const { result } = renderHook(() => useWorkspaces(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(workspaces)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/workspaces',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })

  it('returns error on fetch failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    })

    fetchMock.mockResolvedValue(
      jsonResponse(
        { error: 'Forbidden', message: 'Access denied', statusCode: 403 },
        403,
      ),
    )

    const { result } = renderHook(() => useWorkspaces(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeDefined()
  })
})

describe('useCreateWorkspace', () => {
  it('creates workspace and invalidates queries', async () => {
    const newWorkspace = { id: '2', name: 'New WS', slug: 'new-ws' }
    fetchMock.mockResolvedValue(jsonResponse({ data: newWorkspace }))

    const { result } = renderHook(() => useCreateWorkspace(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ name: 'New WS', slug: 'new-ws' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(newWorkspace)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/workspaces',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'New WS', slug: 'new-ws' }),
      }),
    )
  })
})
