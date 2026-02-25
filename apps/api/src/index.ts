import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { auth } from './auth.js'
import { healthRoute } from './routes/index.js'

const app = new Hono()

app.use(
  '*',
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }),
)

app.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw))

app.route('/health', healthRoute)

serve({ fetch: app.fetch, port: 3001 }, (info) => {
  console.log(`API server running on http://localhost:${info.port}`)
})
