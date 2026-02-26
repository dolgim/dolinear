import { randomUUID } from 'node:crypto'
import { Hono } from 'hono'
import { eq, and, sql, desc, asc, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.ts'
import * as schema from '../db/schema/index.ts'
import { validateRequest } from '../lib/validation.ts'
import { parseQuery } from '../lib/validation.ts'
import {
  handleError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../lib/errors.ts'
import { requireWorkspaceMember } from '../middleware/workspace.ts'
import type { WorkspaceEnv } from '../types.ts'

const createIssueSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().nullish(),
  workflowStateId: z.string().optional(),
  priority: z.number().int().min(0).max(4).default(0),
  assigneeId: z.string().nullish(),
  dueDate: z.string().nullish(),
  estimate: z.number().int().min(0).nullish(),
  labelIds: z.array(z.string()).optional(),
})

const updateIssueSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().nullish(),
  workflowStateId: z.string().optional(),
  priority: z.number().int().min(0).max(4).optional(),
  assigneeId: z.string().nullish(),
  dueDate: z.string().nullish(),
  estimate: z.number().int().min(0).nullish(),
  sortOrder: z.number().optional(),
})

const listIssuesQuerySchema = z.object({
  workflowStateId: z.string().optional(),
  stateType: z
    .enum(['backlog', 'unstarted', 'started', 'completed', 'cancelled'])
    .optional(),
  priority: z.coerce.number().int().min(0).max(4).optional(),
  assigneeId: z.string().optional(),
  labelId: z.string().optional(),
  sort: z.enum(['sortOrder', 'createdAt', 'priority', 'dueDate']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
})

// Issues are nested under a team: /api/workspaces/:workspaceId/teams/:teamId/issues
export const issuesRoute = new Hono<
  WorkspaceEnv & { Variables: WorkspaceEnv['Variables'] & { teamId: string } }
>()

// Ensure workspace membership and validate team
issuesRoute.use('*', requireWorkspaceMember())
issuesRoute.use('*', async (c, next) => {
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
  return next()
})

// POST / — Create issue
issuesRoute.post('/', async (c) => {
  const body = await validateRequest(c, createIssueSchema)
  const teamId = c.get('teamId')
  const user = c.get('user')

  const issueId = randomUUID()
  const now = new Date()

  // Use a transaction: increment counter, resolve default state, create issue
  const created = await db.transaction(async (tx) => {
    // Increment issueCounter atomically and get the new value
    const [updatedTeam] = await tx
      .update(schema.team)
      .set({
        issueCounter: sql`${schema.team.issueCounter} + 1`,
        updatedAt: now,
      })
      .where(eq(schema.team.id, teamId))
      .returning({
        issueCounter: schema.team.issueCounter,
        identifier: schema.team.identifier,
      })

    const issueNumber = updatedTeam.issueCounter
    const identifier = `${updatedTeam.identifier}-${issueNumber}`

    // Resolve workflowStateId — use provided or default to Backlog
    let workflowStateId = body.workflowStateId
    if (!workflowStateId) {
      const [backlogState] = await tx
        .select({ id: schema.workflowState.id })
        .from(schema.workflowState)
        .where(
          and(
            eq(schema.workflowState.teamId, teamId),
            eq(schema.workflowState.type, 'backlog'),
          ),
        )
        .limit(1)

      if (!backlogState) {
        throw new ValidationError(
          'No backlog workflow state found for this team',
        )
      }
      workflowStateId = backlogState.id
    } else {
      // Validate the provided workflowStateId belongs to this team
      const [state] = await tx
        .select({ id: schema.workflowState.id })
        .from(schema.workflowState)
        .where(
          and(
            eq(schema.workflowState.id, workflowStateId),
            eq(schema.workflowState.teamId, teamId),
          ),
        )
        .limit(1)

      if (!state) {
        throw new NotFoundError('Workflow state')
      }
    }

    // Calculate sortOrder: new issues go to the top (lowest sortOrder)
    const [minSort] = await tx
      .select({ min: sql<number>`COALESCE(MIN(${schema.issue.sortOrder}), 0)` })
      .from(schema.issue)
      .where(eq(schema.issue.teamId, teamId))

    const sortOrder = (minSort?.min ?? 0) - 1

    await tx.insert(schema.issue).values({
      id: issueId,
      teamId,
      number: issueNumber,
      identifier,
      title: body.title,
      description: body.description ?? null,
      workflowStateId,
      priority: body.priority,
      assigneeId: body.assigneeId ?? null,
      creatorId: user.id,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      estimate: body.estimate ?? null,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    })

    // Attach labels if provided
    if (body.labelIds && body.labelIds.length > 0) {
      await tx.insert(schema.issueLabel).values(
        body.labelIds.map((labelId) => ({
          issueId,
          labelId,
        })),
      )
    }

    const [result] = await tx
      .select()
      .from(schema.issue)
      .where(eq(schema.issue.id, issueId))

    return result
  })

  return c.json({ data: created }, 201)
})

// GET / — List issues with filtering, sorting, pagination
issuesRoute.get('/', async (c) => {
  const teamId = c.get('teamId')
  const query = parseQuery(listIssuesQuerySchema, c.req.query())

  const conditions = [eq(schema.issue.teamId, teamId)]

  if (query.workflowStateId) {
    conditions.push(eq(schema.issue.workflowStateId, query.workflowStateId))
  }

  if (query.priority !== undefined) {
    conditions.push(eq(schema.issue.priority, query.priority))
  }

  if (query.assigneeId) {
    conditions.push(eq(schema.issue.assigneeId, query.assigneeId))
  }

  // Filter by stateType: join with workflowState
  if (query.stateType) {
    const stateIds = await db
      .select({ id: schema.workflowState.id })
      .from(schema.workflowState)
      .where(
        and(
          eq(schema.workflowState.teamId, teamId),
          eq(schema.workflowState.type, query.stateType),
        ),
      )

    if (stateIds.length === 0) {
      return c.json({
        data: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
        hasMore: false,
      })
    }

    conditions.push(
      inArray(
        schema.issue.workflowStateId,
        stateIds.map((s) => s.id),
      ),
    )
  }

  // Filter by labelId: find issue IDs that have the label
  if (query.labelId) {
    const issueLabelRows = await db
      .select({ issueId: schema.issueLabel.issueId })
      .from(schema.issueLabel)
      .where(eq(schema.issueLabel.labelId, query.labelId))

    if (issueLabelRows.length === 0) {
      return c.json({
        data: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
        hasMore: false,
      })
    }

    conditions.push(
      inArray(
        schema.issue.id,
        issueLabelRows.map((r) => r.issueId),
      ),
    )
  }

  const whereClause = and(...conditions)

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.issue)
    .where(whereClause)

  const total = countResult?.count ?? 0

  // Determine sort
  const sortField = query.sort ?? 'sortOrder'
  const sortOrder = query.order ?? 'asc'

  const sortColumnMap = {
    sortOrder: schema.issue.sortOrder,
    createdAt: schema.issue.createdAt,
    priority: schema.issue.priority,
    dueDate: schema.issue.dueDate,
  } as const

  const sortColumn = sortColumnMap[sortField]
  const orderFn = sortOrder === 'desc' ? desc : asc

  const offset = (query.page - 1) * query.pageSize

  const issues = await db
    .select()
    .from(schema.issue)
    .where(whereClause)
    .orderBy(orderFn(sortColumn))
    .limit(query.pageSize)
    .offset(offset)

  return c.json({
    data: issues,
    total,
    page: query.page,
    pageSize: query.pageSize,
    hasMore: offset + issues.length < total,
  })
})

// GET /:issueIdentifier — Get issue by identifier
issuesRoute.get('/:issueIdentifier', async (c) => {
  const teamId = c.get('teamId')
  const issueIdentifier = c.req.param('issueIdentifier')!

  const [found] = await db
    .select()
    .from(schema.issue)
    .where(
      and(
        eq(schema.issue.identifier, issueIdentifier),
        eq(schema.issue.teamId, teamId),
      ),
    )

  if (!found) {
    throw new NotFoundError('Issue')
  }

  // Get labels for this issue
  const labels = await db
    .select({
      id: schema.label.id,
      name: schema.label.name,
      color: schema.label.color,
    })
    .from(schema.issueLabel)
    .innerJoin(schema.label, eq(schema.issueLabel.labelId, schema.label.id))
    .where(eq(schema.issueLabel.issueId, found.id))

  return c.json({ data: { ...found, labels } })
})

// PATCH /:issueIdentifier — Update issue by identifier
issuesRoute.patch('/:issueIdentifier', async (c) => {
  const body = await validateRequest(c, updateIssueSchema)
  const teamId = c.get('teamId')
  const issueIdentifier = c.req.param('issueIdentifier')!

  const [existing] = await db
    .select()
    .from(schema.issue)
    .where(
      and(
        eq(schema.issue.identifier, issueIdentifier),
        eq(schema.issue.teamId, teamId),
      ),
    )

  if (!existing) {
    throw new NotFoundError('Issue')
  }

  // Validate workflowStateId if changing
  if (body.workflowStateId) {
    const [state] = await db
      .select({ id: schema.workflowState.id })
      .from(schema.workflowState)
      .where(
        and(
          eq(schema.workflowState.id, body.workflowStateId),
          eq(schema.workflowState.teamId, teamId),
        ),
      )
      .limit(1)

    if (!state) {
      throw new NotFoundError('Workflow state')
    }
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() }
  if (body.title !== undefined) updateData.title = body.title
  if (body.description !== undefined)
    updateData.description = body.description ?? null
  if (body.workflowStateId !== undefined)
    updateData.workflowStateId = body.workflowStateId
  if (body.priority !== undefined) updateData.priority = body.priority
  if (body.assigneeId !== undefined)
    updateData.assigneeId = body.assigneeId ?? null
  if (body.dueDate !== undefined)
    updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null
  if (body.estimate !== undefined) updateData.estimate = body.estimate ?? null
  if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder

  await db
    .update(schema.issue)
    .set(updateData)
    .where(eq(schema.issue.id, existing.id))

  const [updated] = await db
    .select()
    .from(schema.issue)
    .where(eq(schema.issue.id, existing.id))

  return c.json({ data: updated })
})

// DELETE /:issueIdentifier — Delete issue by identifier
issuesRoute.delete('/:issueIdentifier', async (c) => {
  const teamId = c.get('teamId')
  const issueIdentifier = c.req.param('issueIdentifier')!

  const [existing] = await db
    .select()
    .from(schema.issue)
    .where(
      and(
        eq(schema.issue.identifier, issueIdentifier),
        eq(schema.issue.teamId, teamId),
      ),
    )

  if (!existing) {
    throw new NotFoundError('Issue')
  }

  await db.delete(schema.issue).where(eq(schema.issue.id, existing.id))

  return c.json({ message: 'Issue deleted' })
})

// POST /:issueIdentifier/labels — Attach label to issue
issuesRoute.post('/:issueIdentifier/labels', async (c) => {
  const body = await validateRequest(
    c,
    z.object({ labelId: z.string().min(1) }),
  )
  const teamId = c.get('teamId')
  const issueIdentifier = c.req.param('issueIdentifier')!

  const [issueRow] = await db
    .select()
    .from(schema.issue)
    .where(
      and(
        eq(schema.issue.identifier, issueIdentifier),
        eq(schema.issue.teamId, teamId),
      ),
    )

  if (!issueRow) {
    throw new NotFoundError('Issue')
  }

  // Check if already attached
  const [existingLink] = await db
    .select()
    .from(schema.issueLabel)
    .where(
      and(
        eq(schema.issueLabel.issueId, issueRow.id),
        eq(schema.issueLabel.labelId, body.labelId),
      ),
    )

  if (existingLink) {
    throw new ConflictError('Label is already attached to this issue')
  }

  await db.insert(schema.issueLabel).values({
    issueId: issueRow.id,
    labelId: body.labelId,
  })

  return c.json({ message: 'Label attached' }, 201)
})

// DELETE /:issueIdentifier/labels/:labelId — Detach label from issue
issuesRoute.delete('/:issueIdentifier/labels/:labelId', async (c) => {
  const teamId = c.get('teamId')
  const issueIdentifier = c.req.param('issueIdentifier')!
  const labelId = c.req.param('labelId')!

  const [issueRow] = await db
    .select()
    .from(schema.issue)
    .where(
      and(
        eq(schema.issue.identifier, issueIdentifier),
        eq(schema.issue.teamId, teamId),
      ),
    )

  if (!issueRow) {
    throw new NotFoundError('Issue')
  }

  const [existingLink] = await db
    .select()
    .from(schema.issueLabel)
    .where(
      and(
        eq(schema.issueLabel.issueId, issueRow.id),
        eq(schema.issueLabel.labelId, labelId),
      ),
    )

  if (!existingLink) {
    throw new NotFoundError('Issue label')
  }

  await db
    .delete(schema.issueLabel)
    .where(
      and(
        eq(schema.issueLabel.issueId, issueRow.id),
        eq(schema.issueLabel.labelId, labelId),
      ),
    )

  return c.json({ message: 'Label detached' })
})

issuesRoute.onError(handleError)
