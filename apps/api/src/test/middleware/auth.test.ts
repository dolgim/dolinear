import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { auth } from '../../auth.js'
import { authMiddleware } from '../../middleware/auth.js'
import { createAuthenticatedUser } from '../auth-helpers.js'
import { createTestDb } from '../helpers.js'
import type { Env } from '../../types.js'

describe('Auth Middleware', () => {
  const { db, client } = createTestDb()

  function createApp() {
    const app = new Hono<Env>()

    app.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw))
    app.use('*', authMiddleware)

    app.get('/health', (c) => c.json({ status: 'ok' }))

    app.get('/protected', (c) => {
      const user = c.get('user')
      return c.json({ user: { id: user.id, email: user.email } })
    })

    return app
  }

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE "session" CASCADE`)
    await db.execute(sql`TRUNCATE TABLE "account" CASCADE`)
    await db.execute(sql`TRUNCATE TABLE "user" CASCADE`)
    await db.execute(sql`TRUNCATE TABLE "verification" CASCADE`)
  })

  afterAll(async () => {
    await client.end()
  })

  it('should allow access with valid session', async () => {
    const app = createApp()
    const { cookieHeader } = await createAuthenticatedUser(app)

    const res = await app.request('/protected', {
      headers: { Cookie: cookieHeader },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user).toBeDefined()
    expect(body.user.email).toBe('test@example.com')
  })

  it('should return 401 for invalid session', async () => {
    const app = createApp()

    const res = await app.request('/protected', {
      headers: { Cookie: 'better-auth.session_token=invalid-token' },
    })

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('UnauthorizedError')
    expect(body.message).toBe('Unauthorized')
  })

  it('should return 401 when no session is provided', async () => {
    const app = createApp()

    const res = await app.request('/protected')

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('UnauthorizedError')
  })

  it('should bypass middleware for /health and /api/auth/**', async () => {
    const app = createApp()

    const healthRes = await app.request('/health')
    expect(healthRes.status).toBe(200)
    const healthBody = await healthRes.json()
    expect(healthBody.status).toBe('ok')

    const authRes = await app.request('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'password123',
      }),
    })
    // Better Auth handles this request, not our middleware.
    // It may return 401 for invalid credentials, but the response body
    // should NOT contain our middleware's error format.
    if (authRes.status === 401) {
      const body = await authRes.json()
      expect(body.error).not.toBe('UnauthorizedError')
    }
  })
})
