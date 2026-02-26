import { randomUUID } from 'node:crypto'
import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.ts'
import * as schema from '../db/schema/index.ts'
import { validateRequest } from '../lib/validation.ts'
import {
  handleError,
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from '../lib/errors.ts'
import { requireWorkspaceMember } from '../middleware/workspace.ts'
import {
  workflowStatesRoute,
  createDefaultWorkflowStates,
} from './workflow-states.ts'
import type { WorkspaceEnv } from '../types.ts'

const IDENTIFIER_REGEX = /^[A-Z]{2,5}$/

const createTeamSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  identifier: z
    .string()
    .regex(IDENTIFIER_REGEX, 'Identifier must be 2-5 uppercase letters'),
})

const updateTeamSchema = z.object({
  name: z.string().min(1).max(50).optional(),
})

const addMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
})

// Teams are always nested under a workspace: /api/workspaces/:workspaceId/teams
export const teamsRoute = new Hono<WorkspaceEnv>()

// POST / — Create team
teamsRoute.post('/', requireWorkspaceMember(['owner', 'admin']), async (c) => {
  const body = await validateRequest(c, createTeamSchema)
  const ws = c.get('workspace')
  const user = c.get('user')

  // Validate identifier format (extra safety on top of zod)
  if (!IDENTIFIER_REGEX.test(body.identifier)) {
    throw new ValidationError('Identifier must be 2-5 uppercase letters')
  }

  // Check identifier uniqueness within workspace
  const existing = await db
    .select({ id: schema.team.id })
    .from(schema.team)
    .where(
      and(
        eq(schema.team.workspaceId, ws.id),
        eq(schema.team.identifier, body.identifier),
      ),
    )
    .limit(1)

  if (existing.length > 0) {
    throw new ConflictError(
      `Team with identifier '${body.identifier}' already exists in this workspace`,
    )
  }

  const teamId = randomUUID()
  const memberId = randomUUID()
  const now = new Date()

  await db.transaction(async (tx) => {
    await tx.insert(schema.team).values({
      id: teamId,
      workspaceId: ws.id,
      name: body.name,
      identifier: body.identifier,
      issueCounter: 0,
      createdAt: now,
      updatedAt: now,
    })

    // Auto-add creator as team member
    await tx.insert(schema.teamMember).values({
      id: memberId,
      teamId,
      userId: user.id,
      createdAt: now,
      updatedAt: now,
    })

    // Create default workflow states
    await createDefaultWorkflowStates(teamId, tx)
  })

  const [created] = await db
    .select()
    .from(schema.team)
    .where(eq(schema.team.id, teamId))

  return c.json({ data: created }, 201)
})

// GET / — List teams in workspace
teamsRoute.get('/', requireWorkspaceMember(), async (c) => {
  const ws = c.get('workspace')

  const teams = await db
    .select()
    .from(schema.team)
    .where(eq(schema.team.workspaceId, ws.id))

  return c.json({ data: teams })
})

// GET /:teamId — Get team detail
teamsRoute.get('/:teamId', requireWorkspaceMember(), async (c) => {
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

  return c.json({ data: teamRow })
})

// PATCH /:teamId — Update team
teamsRoute.patch(
  '/:teamId',
  requireWorkspaceMember(['owner', 'admin']),
  async (c) => {
    const body = await validateRequest(c, updateTeamSchema)
    const ws = c.get('workspace')
    const teamId = c.req.param('teamId')!

    const [teamRow] = await db
      .select()
      .from(schema.team)
      .where(
        and(eq(schema.team.id, teamId), eq(schema.team.workspaceId, ws.id)),
      )
      .limit(1)

    if (!teamRow) {
      throw new NotFoundError('Team')
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (body.name) {
      updateData.name = body.name
    }

    await db
      .update(schema.team)
      .set(updateData)
      .where(eq(schema.team.id, teamId))

    const [updated] = await db
      .select()
      .from(schema.team)
      .where(eq(schema.team.id, teamId))

    return c.json({ data: updated })
  },
)

// DELETE /:teamId — Delete team
teamsRoute.delete(
  '/:teamId',
  requireWorkspaceMember(['owner', 'admin']),
  async (c) => {
    const ws = c.get('workspace')
    const teamId = c.req.param('teamId')!

    const [teamRow] = await db
      .select()
      .from(schema.team)
      .where(
        and(eq(schema.team.id, teamId), eq(schema.team.workspaceId, ws.id)),
      )
      .limit(1)

    if (!teamRow) {
      throw new NotFoundError('Team')
    }

    await db.delete(schema.team).where(eq(schema.team.id, teamId))

    return c.json({ message: 'Team deleted' })
  },
)

// POST /:teamId/members — Add team member
teamsRoute.post(
  '/:teamId/members',
  requireWorkspaceMember(['owner', 'admin']),
  async (c) => {
    const body = await validateRequest(c, addMemberSchema)
    const ws = c.get('workspace')
    const teamId = c.req.param('teamId')!

    // Check team exists in this workspace
    const [teamRow] = await db
      .select()
      .from(schema.team)
      .where(
        and(eq(schema.team.id, teamId), eq(schema.team.workspaceId, ws.id)),
      )
      .limit(1)

    if (!teamRow) {
      throw new NotFoundError('Team')
    }

    // Check target user is a workspace member
    const [wsMember] = await db
      .select()
      .from(schema.workspaceMember)
      .where(
        and(
          eq(schema.workspaceMember.workspaceId, ws.id),
          eq(schema.workspaceMember.userId, body.userId),
        ),
      )
      .limit(1)

    if (!wsMember) {
      throw new ForbiddenError('User is not a member of this workspace')
    }

    // Check not already a team member
    const existingMember = await db
      .select()
      .from(schema.teamMember)
      .where(
        and(
          eq(schema.teamMember.teamId, teamId),
          eq(schema.teamMember.userId, body.userId),
        ),
      )
      .limit(1)

    if (existingMember.length > 0) {
      throw new ConflictError('User is already a member of this team')
    }

    const memberId = randomUUID()
    const now = new Date()

    await db.insert(schema.teamMember).values({
      id: memberId,
      teamId,
      userId: body.userId,
      createdAt: now,
      updatedAt: now,
    })

    const [created] = await db
      .select()
      .from(schema.teamMember)
      .where(eq(schema.teamMember.id, memberId))

    return c.json({ data: created }, 201)
  },
)

// GET /:teamId/members — List team members
teamsRoute.get('/:teamId/members', requireWorkspaceMember(), async (c) => {
  const ws = c.get('workspace')
  const teamId = c.req.param('teamId')!

  // Check team exists in this workspace
  const [teamRow] = await db
    .select()
    .from(schema.team)
    .where(and(eq(schema.team.id, teamId), eq(schema.team.workspaceId, ws.id)))
    .limit(1)

  if (!teamRow) {
    throw new NotFoundError('Team')
  }

  const members = await db
    .select({
      id: schema.teamMember.id,
      teamId: schema.teamMember.teamId,
      userId: schema.teamMember.userId,
      createdAt: schema.teamMember.createdAt,
      updatedAt: schema.teamMember.updatedAt,
      user: {
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        image: schema.user.image,
      },
    })
    .from(schema.teamMember)
    .innerJoin(schema.user, eq(schema.teamMember.userId, schema.user.id))
    .where(eq(schema.teamMember.teamId, teamId))

  return c.json({ data: members })
})

teamsRoute.route('/:teamId/states', workflowStatesRoute)

teamsRoute.onError(handleError)
