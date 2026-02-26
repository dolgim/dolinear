import { randomUUID } from 'node:crypto'
import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.ts'
import * as schema from '../db/schema/index.ts'
import { validateRequest } from '../lib/validation.ts'
import { handleError, NotFoundError, AppError } from '../lib/errors.ts'
import { requireWorkspaceMember } from '../middleware/workspace.ts'
import type { WorkspaceEnv } from '../types.ts'

const createLabelSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  color: z.string().min(1, 'Color is required').max(20),
  description: z.string().max(200).nullish(),
})

const updateLabelSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().min(1).max(20).optional(),
  description: z.string().max(200).nullish(),
})

// Labels are nested under a workspace: /api/workspaces/:workspaceId/labels
export const labelsRoute = new Hono<WorkspaceEnv>()

// POST / — Create label
labelsRoute.post('/', requireWorkspaceMember(), async (c) => {
  const body = await validateRequest(c, createLabelSchema)
  const ws = c.get('workspace')

  // Check for duplicate name in workspace
  const existing = await db
    .select({ id: schema.label.id })
    .from(schema.label)
    .where(
      and(
        eq(schema.label.workspaceId, ws.id),
        eq(schema.label.name, body.name),
      ),
    )
    .limit(1)

  if (existing.length > 0) {
    throw new AppError(409, 'Label with this name already exists in workspace')
  }

  const labelId = randomUUID()
  const now = new Date()

  await db.insert(schema.label).values({
    id: labelId,
    workspaceId: ws.id,
    name: body.name,
    color: body.color,
    description: body.description ?? null,
    createdAt: now,
    updatedAt: now,
  })

  const [created] = await db
    .select()
    .from(schema.label)
    .where(eq(schema.label.id, labelId))

  return c.json({ data: created }, 201)
})

// GET / — List labels in workspace
labelsRoute.get('/', requireWorkspaceMember(), async (c) => {
  const ws = c.get('workspace')

  const labels = await db
    .select()
    .from(schema.label)
    .where(eq(schema.label.workspaceId, ws.id))

  return c.json({ data: labels })
})

// GET /:labelId — Get label detail
labelsRoute.get('/:labelId', requireWorkspaceMember(), async (c) => {
  const ws = c.get('workspace')
  const labelId = c.req.param('labelId')

  const [found] = await db
    .select()
    .from(schema.label)
    .where(
      and(eq(schema.label.id, labelId), eq(schema.label.workspaceId, ws.id)),
    )

  if (!found) {
    throw new NotFoundError('Label')
  }

  return c.json({ data: found })
})

// PATCH /:labelId — Update label
labelsRoute.patch('/:labelId', requireWorkspaceMember(), async (c) => {
  const body = await validateRequest(c, updateLabelSchema)
  const ws = c.get('workspace')
  const labelId = c.req.param('labelId')

  const [existing] = await db
    .select()
    .from(schema.label)
    .where(
      and(eq(schema.label.id, labelId), eq(schema.label.workspaceId, ws.id)),
    )

  if (!existing) {
    throw new NotFoundError('Label')
  }

  // If name is being changed, check for duplicates
  if (body.name && body.name !== existing.name) {
    const duplicate = await db
      .select({ id: schema.label.id })
      .from(schema.label)
      .where(
        and(
          eq(schema.label.workspaceId, ws.id),
          eq(schema.label.name, body.name),
        ),
      )
      .limit(1)

    if (duplicate.length > 0) {
      throw new AppError(
        409,
        'Label with this name already exists in workspace',
      )
    }
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() }
  if (body.name !== undefined) updateData.name = body.name
  if (body.color !== undefined) updateData.color = body.color
  if (body.description !== undefined)
    updateData.description = body.description ?? null

  await db
    .update(schema.label)
    .set(updateData)
    .where(eq(schema.label.id, labelId))

  const [updated] = await db
    .select()
    .from(schema.label)
    .where(eq(schema.label.id, labelId))

  return c.json({ data: updated })
})

// DELETE /:labelId — Delete label
labelsRoute.delete('/:labelId', requireWorkspaceMember(), async (c) => {
  const ws = c.get('workspace')
  const labelId = c.req.param('labelId')

  const [existing] = await db
    .select()
    .from(schema.label)
    .where(
      and(eq(schema.label.id, labelId), eq(schema.label.workspaceId, ws.id)),
    )

  if (!existing) {
    throw new NotFoundError('Label')
  }

  await db.delete(schema.label).where(eq(schema.label.id, labelId))

  return c.json({ message: 'Label deleted' })
})

labelsRoute.onError(handleError)
