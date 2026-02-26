import { drizzle } from 'drizzle-orm/postgres-js'
import { sql } from 'drizzle-orm'
import postgres from 'postgres'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createMiddleware } from 'hono/factory'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import * as schema from '../db/schema/index.ts'
import { workspacesRoute } from '../routes/workspaces.ts'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { Env } from '../types.ts'

export function createTestDb() {
  const connectionString = process.env.DATABASE_URL!
  const client = postgres(connectionString)
  const db = drizzle(client, { schema })

  return { db, client }
}

export function createTestApp(db: PostgresJsDatabase<typeof schema>) {
  const auth = betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema,
    }),
    emailAndPassword: {
      enabled: true,
    },
    trustedOrigins: ['http://localhost:5173'],
  })

  const testAuthMiddleware = createMiddleware<Env>(async (c, next) => {
    const path = c.req.path

    if (path === '/health' || path.startsWith('/api/auth/')) {
      return next()
    }

    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    })

    if (!session) {
      return c.json(
        {
          error: 'UnauthorizedError',
          message: 'Unauthorized',
          statusCode: 401,
        },
        401,
      )
    }

    c.set('user', session.user)
    c.set('session', session.session)

    return next()
  })

  const app = new Hono<Env>()

  app.use(
    '*',
    cors({
      origin: 'http://localhost:5173',
      credentials: true,
    }),
  )

  app.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw))
  app.use('*', testAuthMiddleware)
  app.route('/api/workspaces', workspacesRoute)

  return { app, auth }
}

export async function createTestUser(
  app: Hono,
  overrides?: { name?: string; email?: string; password?: string },
) {
  const name = overrides?.name ?? 'Test User'
  const email = overrides?.email ?? 'test@example.com'
  const password = overrides?.password ?? 'password123'

  const res = await app.request('/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to create test user: ${res.status} ${body}`)
  }

  const data = await res.json()
  const setCookie = res.headers.get('set-cookie')

  return { user: data.user, setCookie, token: data.token }
}

export async function createAuthenticatedRequest(
  app: Hono,
  method: string,
  path: string,
  options?: {
    cookie?: string
    body?: unknown
    headers?: Record<string, string>
  },
) {
  const headers: Record<string, string> = {
    ...options?.headers,
  }

  if (options?.cookie) {
    headers['cookie'] = options.cookie
  }

  if (options?.body) {
    headers['content-type'] = 'application/json'
  }

  return app.request(path, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })
}

export async function cleanupDatabase(db: PostgresJsDatabase<typeof schema>) {
  await db.execute(sql`TRUNCATE TABLE "workspace_member" CASCADE`)
  await db.execute(sql`TRUNCATE TABLE "workspace" CASCADE`)
  await db.execute(sql`TRUNCATE TABLE "verification" CASCADE`)
  await db.execute(sql`TRUNCATE TABLE "account" CASCADE`)
  await db.execute(sql`TRUNCATE TABLE "session" CASCADE`)
  await db.execute(sql`TRUNCATE TABLE "user" CASCADE`)
}
