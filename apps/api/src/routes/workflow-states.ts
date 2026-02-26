import { randomUUID } from 'node:crypto'
import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.ts'
import * as schema from '../db/schema/index.ts'
import { validateRequest } from '../lib/validation.ts'
import { handleError, NotFoundError, ConflictError } from '../lib/errors.ts'
import { requireWorkspaceMember } from '../middleware/workspace.ts'
import type { WorkspaceEnv } from '../types.ts'

const WORKFLOW_STATE_TYPES = [
  'backlog',
  'unstarted',
  'started',
  'completed',
  'cancelled',
] as const

const createStateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  color: z.string().min(1, 'Color is required').max(20),
  type: z.enum(WORKFLOW_STATE_TYPES),
  position: z.number().int().min(0),
})

const updateStateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().min(1).max(20).optional(),
  type: z.enum(WORKFLOW_STATE_TYPES).optional(),
  position: z.number().int().min(0).optional(),
})

export interface DefaultWorkflowState {
  name: string
  color: string
  type: (typeof WORKFLOW_STATE_TYPES)[number]
  position: number
}

export const DEFAULT_WORKFLOW_STATES: DefaultWorkflowState[] = [
  { name: 'Backlog', color: '#bec2c8', type: 'backlog', position: 0 },
  { name: 'Todo', color: '#e2e2e2', type: 'unstarted', position: 1 },
  { name: 'In Progress', color: '#f2c94c', type: 'started', position: 2 },
  { name: 'In Review', color: '#5e6ad2', type: 'started', position: 3 },
  { name: 'Done', color: '#4cb782', type: 'completed', position: 4 },
  { name: 'Canceled', color: '#95a2b3', type: 'cancelled', position: 5 },
]

export async function createDefaultWorkflowStates(
  teamId: string,
  executor: { insert: (typeof db)['insert'] } = db,
) {
  const now = new Date()

  await executor.insert(schema.workflowState).values(
    DEFAULT_WORKFLOW_STATES.map((state) => ({
      id: randomUUID(),
      teamId,
      name: state.name,
      color: state.color,
      type: state.type,
      position: state.position,
      createdAt: now,
      updatedAt: now,
    })),
  )
}

// Workflow states are nested under a team: /api/workspaces/:workspaceId/teams/:teamId/states
export const workflowStatesRoute = new Hono<
  WorkspaceEnv & { Variables: WorkspaceEnv['Variables'] & { teamId: string } }
>()

// First ensure workspace membership, then validate team
workflowStatesRoute.use('*', requireWorkspaceMember())
workflowStatesRoute.use('*', async (c, next) => {
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

// GET / — List workflow states for a team
workflowStatesRoute.get('/', async (c) => {
  const teamId = c.get('teamId')

  const states = await db
    .select()
    .from(schema.workflowState)
    .where(eq(schema.workflowState.teamId, teamId))
    .orderBy(schema.workflowState.position)

  return c.json({ data: states })
})

// POST / — Create workflow state
workflowStatesRoute.post('/', async (c) => {
  const body = await validateRequest(c, createStateSchema)
  const teamId = c.get('teamId')

  // Check for duplicate name in team
  const existing = await db
    .select({ id: schema.workflowState.id })
    .from(schema.workflowState)
    .where(
      and(
        eq(schema.workflowState.teamId, teamId),
        eq(schema.workflowState.name, body.name),
      ),
    )
    .limit(1)

  if (existing.length > 0) {
    throw new ConflictError(
      'Workflow state with this name already exists in team',
    )
  }

  const stateId = randomUUID()
  const now = new Date()

  await db.insert(schema.workflowState).values({
    id: stateId,
    teamId,
    name: body.name,
    color: body.color,
    type: body.type,
    position: body.position,
    createdAt: now,
    updatedAt: now,
  })

  const [created] = await db
    .select()
    .from(schema.workflowState)
    .where(eq(schema.workflowState.id, stateId))

  return c.json({ data: created }, 201)
})

// PATCH /:stateId — Update workflow state
workflowStatesRoute.patch('/:stateId', async (c) => {
  const body = await validateRequest(c, updateStateSchema)
  const teamId = c.get('teamId')
  const stateId = c.req.param('stateId')!

  const [existing] = await db
    .select()
    .from(schema.workflowState)
    .where(
      and(
        eq(schema.workflowState.id, stateId),
        eq(schema.workflowState.teamId, teamId),
      ),
    )

  if (!existing) {
    throw new NotFoundError('Workflow state')
  }

  // If name is being changed, check for duplicates
  if (body.name && body.name !== existing.name) {
    const duplicate = await db
      .select({ id: schema.workflowState.id })
      .from(schema.workflowState)
      .where(
        and(
          eq(schema.workflowState.teamId, teamId),
          eq(schema.workflowState.name, body.name),
        ),
      )
      .limit(1)

    if (duplicate.length > 0) {
      throw new ConflictError(
        'Workflow state with this name already exists in team',
      )
    }
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() }
  if (body.name !== undefined) updateData.name = body.name
  if (body.color !== undefined) updateData.color = body.color
  if (body.type !== undefined) updateData.type = body.type
  if (body.position !== undefined) updateData.position = body.position

  await db
    .update(schema.workflowState)
    .set(updateData)
    .where(eq(schema.workflowState.id, stateId))

  const [updated] = await db
    .select()
    .from(schema.workflowState)
    .where(eq(schema.workflowState.id, stateId))

  return c.json({ data: updated })
})

// DELETE /:stateId — Delete workflow state (only if no issues use it)
workflowStatesRoute.delete('/:stateId', async (c) => {
  const teamId = c.get('teamId')
  const stateId = c.req.param('stateId')!

  const [existing] = await db
    .select()
    .from(schema.workflowState)
    .where(
      and(
        eq(schema.workflowState.id, stateId),
        eq(schema.workflowState.teamId, teamId),
      ),
    )

  if (!existing) {
    throw new NotFoundError('Workflow state')
  }

  // TODO: Check if any issues use this state (will be added when issue schema exists)
  // For now, allow deletion freely

  await db
    .delete(schema.workflowState)
    .where(eq(schema.workflowState.id, stateId))

  return c.json({ message: 'Workflow state deleted' })
})

workflowStatesRoute.onError(handleError)
