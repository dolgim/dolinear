import { randomUUID } from 'node:crypto'
import { Hono } from 'hono'
import { eq, and, asc } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.ts'
import * as schema from '../db/schema/index.ts'
import { validateRequest } from '../lib/validation.ts'
import { handleError, NotFoundError, ForbiddenError } from '../lib/errors.ts'
import { requireWorkspaceMember } from '../middleware/workspace.ts'
import type { WorkspaceEnv } from '../types.ts'

const createCommentSchema = z.object({
  body: z.string().min(1, 'Body is required'),
})

const updateCommentSchema = z.object({
  body: z.string().min(1, 'Body is required'),
})

// Comments are nested under issues:
// POST /api/workspaces/:workspaceId/teams/:teamId/issues/:issueId/comments
// GET  /api/workspaces/:workspaceId/teams/:teamId/issues/:issueId/comments
// PATCH  /api/workspaces/:workspaceId/teams/:teamId/issues/:issueId/comments/:commentId
// DELETE /api/workspaces/:workspaceId/teams/:teamId/issues/:issueId/comments/:commentId
export const commentsRoute = new Hono<
  WorkspaceEnv & {
    Variables: WorkspaceEnv['Variables'] & { teamId: string; issueId: string }
  }
>()

// Ensure workspace membership, validate team and issue
commentsRoute.use('*', requireWorkspaceMember())
commentsRoute.use('*', async (c, next) => {
  const ws = c.get('workspace')
  const teamId = c.req.param('teamId')!

  const [teamRow] = await db
    .select()
    .from(schema.team)
    .where(and(eq(schema.team.id, teamId), eq(schema.team.workspaceId, ws.id)))
    .limit(1)

  if (!teamRow) {
    throw new NotFoundError('Team')
  }

  c.set('teamId', teamId)

  const issueId = c.req.param('issueId')!

  const [issueRow] = await db
    .select()
    .from(schema.issue)
    .where(and(eq(schema.issue.id, issueId), eq(schema.issue.teamId, teamId)))
    .limit(1)

  if (!issueRow) {
    throw new NotFoundError('Issue')
  }

  c.set('issueId', issueId)

  return next()
})

// POST / — Create comment
commentsRoute.post('/', async (c) => {
  const body = await validateRequest(c, createCommentSchema)
  const issueId = c.get('issueId')
  const user = c.get('user')

  const commentId = randomUUID()
  const now = new Date()

  await db.insert(schema.comment).values({
    id: commentId,
    issueId,
    userId: user.id,
    body: body.body,
    createdAt: now,
    updatedAt: now,
  })

  const [created] = await db
    .select()
    .from(schema.comment)
    .where(eq(schema.comment.id, commentId))

  return c.json({ data: created }, 201)
})

// GET / — List comments for issue
commentsRoute.get('/', async (c) => {
  const issueId = c.get('issueId')

  const comments = await db
    .select()
    .from(schema.comment)
    .where(eq(schema.comment.issueId, issueId))
    .orderBy(asc(schema.comment.createdAt))

  return c.json({ data: comments })
})

// PATCH /:commentId — Update comment (author only)
commentsRoute.patch('/:commentId', async (c) => {
  const body = await validateRequest(c, updateCommentSchema)
  const commentId = c.req.param('commentId')!
  const issueId = c.get('issueId')
  const user = c.get('user')

  const [existing] = await db
    .select()
    .from(schema.comment)
    .where(
      and(
        eq(schema.comment.id, commentId),
        eq(schema.comment.issueId, issueId),
      ),
    )

  if (!existing) {
    throw new NotFoundError('Comment')
  }

  if (existing.userId !== user.id) {
    throw new ForbiddenError('Only the author can edit this comment')
  }

  await db
    .update(schema.comment)
    .set({ body: body.body, updatedAt: new Date() })
    .where(eq(schema.comment.id, commentId))

  const [updated] = await db
    .select()
    .from(schema.comment)
    .where(eq(schema.comment.id, commentId))

  return c.json({ data: updated })
})

// DELETE /:commentId — Delete comment (author only)
commentsRoute.delete('/:commentId', async (c) => {
  const commentId = c.req.param('commentId')!
  const issueId = c.get('issueId')
  const user = c.get('user')

  const [existing] = await db
    .select()
    .from(schema.comment)
    .where(
      and(
        eq(schema.comment.id, commentId),
        eq(schema.comment.issueId, issueId),
      ),
    )

  if (!existing) {
    throw new NotFoundError('Comment')
  }

  if (existing.userId !== user.id) {
    throw new ForbiddenError('Only the author can delete this comment')
  }

  await db.delete(schema.comment).where(eq(schema.comment.id, commentId))

  return c.json({ message: 'Comment deleted' })
})

commentsRoute.onError(handleError)
