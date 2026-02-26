import { createMiddleware } from 'hono/factory'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/index.ts'
import * as schema from '../db/schema/index.ts'
import { NotFoundError, ForbiddenError } from '../lib/errors.ts'
import type { WorkspaceEnv } from '../types.ts'

export function requireWorkspaceMember(allowedRoles?: string[]) {
  return createMiddleware<WorkspaceEnv>(async (c, next) => {
    const workspaceId = c.req.param('workspaceId')!

    const ws = await db
      .select()
      .from(schema.workspace)
      .where(eq(schema.workspace.id, workspaceId))
      .limit(1)

    if (ws.length === 0) {
      throw new NotFoundError('Workspace')
    }

    const user = c.get('user')
    const member = await db
      .select()
      .from(schema.workspaceMember)
      .where(
        and(
          eq(schema.workspaceMember.workspaceId, workspaceId),
          eq(schema.workspaceMember.userId, user.id),
        ),
      )
      .limit(1)

    if (member.length === 0) {
      throw new ForbiddenError('Not a member of this workspace')
    }

    if (allowedRoles && !allowedRoles.includes(member[0].role)) {
      throw new ForbiddenError('Insufficient permissions')
    }

    c.set('workspace', {
      id: ws[0].id,
      name: ws[0].name,
      slug: ws[0].slug,
      ownerId: ws[0].ownerId,
    })
    c.set('workspaceMember', {
      id: member[0].id,
      role: member[0].role,
    })

    return next()
  })
}
