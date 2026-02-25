import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { auth } from './auth.js'
import { authMiddleware } from './middleware/auth.js'
import { healthRoute } from './routes/index.js'
import type { Env } from './types.js'

const app = new Hono<Env>()

app.use(
  '*',
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }),
)

app.use('*', authMiddleware)

app.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw))

app.route('/health', healthRoute)

serve({ fetch: app.fetch, port: 3001 }, (info) => {
  console.log(`API server running on http://localhost:${info.port}`)
})
