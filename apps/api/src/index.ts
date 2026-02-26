import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { auth } from './auth.js'
import { client } from './db/index.js'
import { authMiddleware } from './middleware/auth.js'
import { healthRoute, workspacesRoute } from './routes/index.js'
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
app.route('/api/workspaces', workspacesRoute)

const server = serve({ fetch: app.fetch, port: 3001 }, (info) => {
  console.log(`API server running on http://localhost:${info.port}`)
})

let isShuttingDown = false

function shutdown() {
  if (isShuttingDown) return
  isShuttingDown = true
  console.log('\nShutting down gracefully...')
  server.close(async () => {
    await client.end()
    console.log('Server stopped')
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
