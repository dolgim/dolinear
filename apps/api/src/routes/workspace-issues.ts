import { Hono } from 'hono'
import { eq, and, sql, desc, asc, ilike, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.ts'
import * as schema from '../db/schema/index.ts'
import { parseQuery } from '../lib/validation.ts'
import { handleError } from '../lib/errors.ts'
import { requireWorkspaceMember } from '../middleware/workspace.ts'
import type { WorkspaceEnv } from '../types.ts'

const listWorkspaceIssuesQuerySchema = z.object({
  assigneeId: z.string().optional(),
  q: z.string().optional(),
  stateType: z
    .enum(['backlog', 'unstarted', 'started', 'completed', 'cancelled'])
    .optional(),
  priority: z.coerce.number().int().min(0).max(4).optional(),
  sort: z.enum(['sortOrder', 'createdAt', 'priority', 'dueDate']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
})

// Workspace-level issues route: GET /api/workspaces/:workspaceId/issues
export const workspaceIssuesRoute = new Hono<WorkspaceEnv>()

workspaceIssuesRoute.use('*', requireWorkspaceMember())

workspaceIssuesRoute.get('/', async (c) => {
  const ws = c.get('workspace')
  const query = parseQuery(listWorkspaceIssuesQuerySchema, c.req.query())

  // Get all team IDs in this workspace
  const teams = await db
    .select({ id: schema.team.id })
    .from(schema.team)
    .where(eq(schema.team.workspaceId, ws.id))

  if (teams.length === 0) {
    return c.json({
      data: [],
      total: 0,
      page: query.page,
      pageSize: query.pageSize,
      hasMore: false,
    })
  }

  const teamIds = teams.map((t) => t.id)

  const conditions = [inArray(schema.issue.teamId, teamIds)]

  if (query.assigneeId) {
    conditions.push(eq(schema.issue.assigneeId, query.assigneeId))
  }

  if (query.q) {
    conditions.push(ilike(schema.issue.title, `%${query.q}%`))
  }

  if (query.priority !== undefined) {
    conditions.push(eq(schema.issue.priority, query.priority))
  }

  // Filter by stateType: find matching workflow state IDs across all teams
  if (query.stateType) {
    const stateIds = await db
      .select({ id: schema.workflowState.id })
      .from(schema.workflowState)
      .where(
        and(
          inArray(schema.workflowState.teamId, teamIds),
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

  // Query issues with team and workflowState JOINs
  const issues = await db
    .select({
      id: schema.issue.id,
      teamId: schema.issue.teamId,
      number: schema.issue.number,
      identifier: schema.issue.identifier,
      title: schema.issue.title,
      description: schema.issue.description,
      workflowStateId: schema.issue.workflowStateId,
      priority: schema.issue.priority,
      assigneeId: schema.issue.assigneeId,
      creatorId: schema.issue.creatorId,
      dueDate: schema.issue.dueDate,
      estimate: schema.issue.estimate,
      sortOrder: schema.issue.sortOrder,
      createdAt: schema.issue.createdAt,
      updatedAt: schema.issue.updatedAt,
      team: {
        identifier: schema.team.identifier,
        name: schema.team.name,
      },
      workflowState: {
        id: schema.workflowState.id,
        name: schema.workflowState.name,
        color: schema.workflowState.color,
        type: schema.workflowState.type,
      },
    })
    .from(schema.issue)
    .innerJoin(schema.team, eq(schema.issue.teamId, schema.team.id))
    .innerJoin(
      schema.workflowState,
      eq(schema.issue.workflowStateId, schema.workflowState.id),
    )
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

workspaceIssuesRoute.onError(handleError)
