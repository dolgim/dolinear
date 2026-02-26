import type { Hono } from 'hono'
import type { Env } from '../types.ts'

export async function createAuthenticatedUser(
  app: Hono<Env>,
  options?: { email?: string; name?: string; password?: string },
) {
  const email = options?.email ?? 'test@example.com'
  const name = options?.name ?? 'Test User'
  const password = options?.password ?? 'password123'

  const signUpRes = await app.request('/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, password }),
  })

  const cookies = signUpRes.headers.getSetCookie()
  const cookieHeader = cookies.map((c) => c.split(';')[0]).join('; ')

  return { cookieHeader, email, name }
}
