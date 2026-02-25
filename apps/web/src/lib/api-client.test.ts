import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient, ApiClientError } from './api-client'

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

describe('apiClient', () => {
  describe('GET requests', () => {
    it('sends GET request with credentials include', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ data: [] }))

      await apiClient.get('/workspaces')

      expect(fetchMock).toHaveBeenCalledWith('/api/workspaces', {
        method: 'GET',
        headers: {},
        credentials: 'include',
        body: undefined,
      })
    })

    it('returns parsed JSON response', async () => {
      const payload = { data: [{ id: '1', name: 'ws' }] }
      fetchMock.mockResolvedValue(jsonResponse(payload))

      const result = await apiClient.get('/workspaces')

      expect(result).toEqual(payload)
    })
  })

  describe('POST requests', () => {
    it('sends POST request with JSON body', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ data: { id: '1' } }))

      await apiClient.post('/workspaces', { name: 'test' })

      expect(fetchMock).toHaveBeenCalledWith('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: 'test' }),
      })
    })
  })

  describe('error handling', () => {
    it('redirects to /login on 401', async () => {
      const hrefSetter = vi.fn()
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true,
      })
      Object.defineProperty(window.location, 'href', {
        set: hrefSetter,
        get: () => '',
        configurable: true,
      })

      fetchMock.mockResolvedValue(jsonResponse({ error: 'Unauthorized' }, 401))

      await expect(apiClient.get('/protected')).rejects.toThrow(ApiClientError)
      expect(hrefSetter).toHaveBeenCalledWith('/login')
    })

    it('throws ApiClientError with server error details', async () => {
      const errorBody = {
        error: 'Validation',
        message: 'Invalid input',
        statusCode: 400,
        details: { name: ['required'] },
      }
      fetchMock.mockResolvedValue(jsonResponse(errorBody, 400))

      try {
        await apiClient.post('/workspaces', {})
        expect.fail('should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(ApiClientError)
        const apiErr = err as ApiClientError
        expect(apiErr.message).toBe('Invalid input')
        expect(apiErr.statusCode).toBe(400)
        expect(apiErr.details).toEqual({ name: ['required'] })
      }
    })

    it('handles non-JSON error responses', async () => {
      fetchMock.mockResolvedValue(
        new Response('Internal Server Error', {
          status: 500,
          statusText: 'Internal Server Error',
        }),
      )

      try {
        await apiClient.get('/broken')
        expect.fail('should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(ApiClientError)
        const apiErr = err as ApiClientError
        expect(apiErr.statusCode).toBe(500)
        expect(apiErr.message).toBe('Internal Server Error')
      }
    })
  })

  describe('other methods', () => {
    it('PUT sends correct method', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ data: {} }))

      await apiClient.put('/issues/1', { title: 'updated' })

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/issues/1',
        expect.objectContaining({ method: 'PUT' }),
      )
    })

    it('PATCH sends correct method', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ data: {} }))

      await apiClient.patch('/issues/1', { status: 'done' })

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/issues/1',
        expect.objectContaining({ method: 'PATCH' }),
      )
    })

    it('DELETE sends correct method', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ data: {} }))

      await apiClient.del('/issues/1')

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/issues/1',
        expect.objectContaining({ method: 'DELETE' }),
      )
    })
  })
})
