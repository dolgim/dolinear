import { randomUUID } from 'node:crypto'
import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.ts'
import * as schema from '../db/schema/index.ts'
import { validateRequest } from '../lib/validation.ts'
import { handleError, NotFoundError, ValidationError } from '../lib/errors.ts'
import { generateSlug, generateUniqueSlug } from '../lib/slug.ts'
import { requireWorkspaceMember } from '../middleware/workspace.ts'
import { labelsRoute } from './labels.ts'
import type { Env, WorkspaceEnv } from '../types.ts'

const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
})

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(50).optional(),
})

const addMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['admin', 'member']),
})

export const workspacesRoute = new Hono<Env>()

// POST / — Create workspace
workspacesRoute.post('/', async (c) => {
  const body = await validateRequest(c, createWorkspaceSchema)
  const user = c.get('user')

  const baseSlug = generateSlug(body.name)
  const slug = await generateUniqueSlug(baseSlug, async (s) => {
    const existing = await db
      .select({ id: schema.workspace.id })
      .from(schema.workspace)
      .where(eq(schema.workspace.slug, s))
      .limit(1)
    return existing.length > 0
  })

  const workspaceId = randomUUID()
  const memberId = randomUUID()
  const now = new Date()

  await db.transaction(async (tx) => {
    await tx.insert(schema.workspace).values({
      id: workspaceId,
      name: body.name,
      slug,
      ownerId: user.id,
      createdAt: now,
      updatedAt: now,
    })

    await tx.insert(schema.workspaceMember).values({
      id: memberId,
      workspaceId,
      userId: user.id,
      role: 'owner',
      createdAt: now,
      updatedAt: now,
    })
  })

  const [created] = await db
    .select()
    .from(schema.workspace)
    .where(eq(schema.workspace.id, workspaceId))

  return c.json({ data: created }, 201)
})

// GET / — List my workspaces
workspacesRoute.get('/', async (c) => {
  const user = c.get('user')

  const rows = await db
    .select({
      id: schema.workspace.id,
      name: schema.workspace.name,
      slug: schema.workspace.slug,
      ownerId: schema.workspace.ownerId,
      createdAt: schema.workspace.createdAt,
      updatedAt: schema.workspace.updatedAt,
    })
    .from(schema.workspaceMember)
    .innerJoin(
      schema.workspace,
      eq(schema.workspaceMember.workspaceId, schema.workspace.id),
    )
    .where(eq(schema.workspaceMember.userId, user.id))

  return c.json({ data: rows })
})

// Workspace-specific routes (require membership)
const wsRoute = new Hono<WorkspaceEnv>()

// GET /:workspaceId — Get workspace detail
wsRoute.get('/', requireWorkspaceMember(), async (c) => {
  const ws = c.get('workspace')
  return c.json({ data: ws })
})

// PATCH /:workspaceId — Update workspace
wsRoute.patch('/', requireWorkspaceMember(['owner', 'admin']), async (c) => {
  const body = await validateRequest(c, updateWorkspaceSchema)
  const ws = c.get('workspace')

  const updateData: Record<string, unknown> = { updatedAt: new Date() }
  if (body.name) {
    updateData.name = body.name
  }

  await db
    .update(schema.workspace)
    .set(updateData)
    .where(eq(schema.workspace.id, ws.id))

  const [updated] = await db
    .select()
    .from(schema.workspace)
    .where(eq(schema.workspace.id, ws.id))

  return c.json({ data: updated })
})

// DELETE /:workspaceId — Delete workspace
wsRoute.delete('/', requireWorkspaceMember(['owner']), async (c) => {
  const ws = c.get('workspace')

  await db.delete(schema.workspace).where(eq(schema.workspace.id, ws.id))

  return c.json({ message: 'Workspace deleted' })
})

// POST /:workspaceId/members — Add member
wsRoute.post(
  '/members',
  requireWorkspaceMember(['owner', 'admin']),
  async (c) => {
    const body = await validateRequest(c, addMemberSchema)
    const ws = c.get('workspace')

    // Check user exists
    const [targetUser] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, body.userId))
      .limit(1)

    if (!targetUser) {
      throw new NotFoundError('User')
    }

    // Check not already a member
    const existing = await db
      .select()
      .from(schema.workspaceMember)
      .where(
        and(
          eq(schema.workspaceMember.workspaceId, ws.id),
          eq(schema.workspaceMember.userId, body.userId),
        ),
      )
      .limit(1)

    if (existing.length > 0) {
      throw new ValidationError('User is already a member')
    }

    const memberId = randomUUID()
    const now = new Date()

    await db.insert(schema.workspaceMember).values({
      id: memberId,
      workspaceId: ws.id,
      userId: body.userId,
      role: body.role,
      createdAt: now,
      updatedAt: now,
    })

    const [created] = await db
      .select()
      .from(schema.workspaceMember)
      .where(eq(schema.workspaceMember.id, memberId))

    return c.json({ data: created }, 201)
  },
)

// GET /:workspaceId/members — List members
wsRoute.get('/members', requireWorkspaceMember(), async (c) => {
  const ws = c.get('workspace')

  const members = await db
    .select({
      id: schema.workspaceMember.id,
      workspaceId: schema.workspaceMember.workspaceId,
      userId: schema.workspaceMember.userId,
      role: schema.workspaceMember.role,
      createdAt: schema.workspaceMember.createdAt,
      updatedAt: schema.workspaceMember.updatedAt,
      user: {
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        image: schema.user.image,
      },
    })
    .from(schema.workspaceMember)
    .innerJoin(schema.user, eq(schema.workspaceMember.userId, schema.user.id))
    .where(eq(schema.workspaceMember.workspaceId, ws.id))

  return c.json({ data: members })
})

wsRoute.route('/labels', labelsRoute)

workspacesRoute.route('/:workspaceId', wsRoute)

workspacesRoute.onError(handleError)
