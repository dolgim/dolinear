import { createMiddleware } from 'hono/factory'
import { auth } from '../auth.ts'
import type { Env } from '../types.ts'

const PUBLIC_PATHS = ['/health']

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const path = c.req.path

  if (PUBLIC_PATHS.includes(path) || path.startsWith('/api/auth/')) {
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
