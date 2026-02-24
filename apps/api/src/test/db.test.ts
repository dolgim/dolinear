import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { createTestDb } from './helpers.js'
import { users } from '../db/schema.js'

describe('Database', () => {
  const { db, client } = createTestDb()

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE users CASCADE`)
  })

  afterAll(async () => {
    await client.end()
  })

  it('should connect to the test database', async () => {
    const result = await db.execute(sql`SELECT 1 as value`)
    expect(result).toBeDefined()
  })

  it('should insert and query a user', async () => {
    const [inserted] = await db
      .insert(users)
      .values({ name: 'Test User', email: 'test@example.com' })
      .returning()

    expect(inserted).toBeDefined()
    expect(inserted.name).toBe('Test User')
    expect(inserted.email).toBe('test@example.com')
    expect(inserted.id).toBeDefined()
    expect(inserted.createdAt).toBeInstanceOf(Date)

    const [found] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'test@example.com'))

    expect(found).toBeDefined()
    expect(found.name).toBe('Test User')
  })

  it('should enforce unique email constraint', async () => {
    await db.insert(users).values({ name: 'User A', email: 'unique@example.com' })

    await expect(
      db.insert(users).values({ name: 'User B', email: 'unique@example.com' })
    ).rejects.toThrow()
  })
})
