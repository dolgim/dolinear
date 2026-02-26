import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { db } from '../db/index.ts'

export const healthRoute = new Hono()

healthRoute.get('/', async (c) => {
  try {
    await db.execute(sql`SELECT 1`)
    return c.json({ status: 'ok', db: 'connected' })
  } catch {
    return c.json({ status: 'ok', db: 'disconnected' }, 500)
  }
})
