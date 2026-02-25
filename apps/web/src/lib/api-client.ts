import type { ApiError } from '@dolinear/shared'

const BASE_URL = '/api'

class ApiClientError extends Error {
  statusCode: number
  details?: Record<string, string[]>

  constructor(error: ApiError) {
    super(error.message)
    this.name = 'ApiClientError'
    this.statusCode = error.statusCode
    this.details = error.details
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${BASE_URL}${path}`
  const headers: Record<string, string> = {}

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(url, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    if (res.status === 401) {
      window.location.href = '/login'
      throw new ApiClientError({
        error: 'Unauthorized',
        message: 'Authentication required',
        statusCode: 401,
      })
    }

    let apiError: ApiError
    try {
      apiError = await res.json()
    } catch {
      apiError = {
        error: 'Unknown',
        message: res.statusText || 'An error occurred',
        statusCode: res.status,
      }
    }
    throw new ApiClientError(apiError)
  }

  return res.json() as Promise<T>
}

export const apiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
}

export { ApiClientError }
