import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from '../../auth.ts'
import { authMiddleware } from '../../middleware/auth.ts'
import { workspacesRoute } from '../../routes/workspaces.ts'
import { createTestDb, cleanupDatabase } from '../helpers.ts'
import { createAuthenticatedUser } from '../auth-helpers.ts'
import type { Env } from '../../types.ts'

describe('Team Routes', () => {
  const { db, client } = createTestDb()

  function createApp() {
    const app = new Hono<Env>()

    app.use(
      '*',
      cors({
        origin: 'http://localhost:5173',
        credentials: true,
      }),
    )

    app.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw))
    app.use('*', authMiddleware)
    app.route('/api/workspaces', workspacesRoute)

    return app
  }

  beforeEach(async () => {
    await cleanupDatabase(db)
  })

  afterAll(async () => {
    await client.end()
  })

  function request(
    app: Hono<Env>,
    method: string,
    path: string,
    cookieHeader: string,
    body?: unknown,
  ) {
    const headers: Record<string, string> = {
      Cookie: cookieHeader,
    }
    if (body) {
      headers['Content-Type'] = 'application/json'
    }
    return app.request(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async function createWorkspace(
    app: Hono<Env>,
    cookieHeader: string,
    name = 'Test Workspace',
  ) {
    const res = await request(app, 'POST', '/api/workspaces', cookieHeader, {
      name,
    })
    const data = await res.json()
    return { res, data }
  }

  async function createTeam(
    app: Hono<Env>,
    cookieHeader: string,
    workspaceId: string,
    options?: { name?: string; identifier?: string },
  ) {
    const name = options?.name ?? 'Engineering'
    const identifier = options?.identifier ?? 'ENG'
    const res = await request(
      app,
      'POST',
      `/api/workspaces/${workspaceId}/teams`,
      cookieHeader,
      { name, identifier },
    )
    const data = await res.json()
    return { res, data }
  }

  async function getUserId(app: Hono<Env>, cookieHeader: string) {
    const sessionRes = await app.request('/api/auth/get-session', {
      headers: { Cookie: cookieHeader },
    })
    const session = await sessionRes.json()
    return session.user.id as string
  }

  describe('POST /api/workspaces/:workspaceId/teams', () => {
    it('should create a team', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: ws } = await createWorkspace(app, cookieHeader)

      const { res, data } = await createTeam(app, cookieHeader, ws.data.id, {
        name: 'Engineering',
        identifier: 'ENG',
      })

      expect(res.status).toBe(201)
      expect(data.data.name).toBe('Engineering')
      expect(data.data.identifier).toBe('ENG')
      expect(data.data.workspaceId).toBe(ws.data.id)
      expect(data.data.issueCounter).toBe(0)
      expect(data.data.id).toBeDefined()
    })

    it('should return 409 for duplicate identifier in same workspace', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: ws } = await createWorkspace(app, cookieHeader)

      await createTeam(app, cookieHeader, ws.data.id, {
        name: 'Engineering',
        identifier: 'ENG',
      })

      const { res, data } = await createTeam(app, cookieHeader, ws.data.id, {
        name: 'Engineering 2',
        identifier: 'ENG',
      })

      expect(res.status).toBe(409)
      expect(data.message).toContain('ENG')
    })

    it('should allow same identifier in different workspaces', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })

      const { data: ws1 } = await createWorkspace(
        app,
        cookieHeader,
        'Workspace 1',
      )
      const { data: ws2 } = await createWorkspace(
        app,
        cookieHeader,
        'Workspace 2',
      )

      const { res: res1 } = await createTeam(app, cookieHeader, ws1.data.id, {
        identifier: 'ENG',
      })
      const { res: res2 } = await createTeam(app, cookieHeader, ws2.data.id, {
        identifier: 'ENG',
      })

      expect(res1.status).toBe(201)
      expect(res2.status).toBe(201)
    })

    it('should return 400 for invalid identifier format', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: ws } = await createWorkspace(app, cookieHeader)

      // Too short (1 char)
      const { res: res1 } = await createTeam(app, cookieHeader, ws.data.id, {
        identifier: 'A',
      })
      expect(res1.status).toBe(400)

      // Too long (6 chars)
      const { res: res2 } = await createTeam(app, cookieHeader, ws.data.id, {
        identifier: 'ABCDEF',
      })
      expect(res2.status).toBe(400)

      // Lowercase
      const { res: res3 } = await createTeam(app, cookieHeader, ws.data.id, {
        identifier: 'eng',
      })
      expect(res3.status).toBe(400)

      // Numbers
      const { res: res4 } = await createTeam(app, cookieHeader, ws.data.id, {
        identifier: 'AB1',
      })
      expect(res4.status).toBe(400)
    })

    it('should accept valid identifier formats', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: ws } = await createWorkspace(app, cookieHeader)

      // 2 chars (min)
      const { res: res1 } = await createTeam(app, cookieHeader, ws.data.id, {
        name: 'Team 1',
        identifier: 'AB',
      })
      expect(res1.status).toBe(201)

      // 5 chars (max)
      const { res: res2 } = await createTeam(app, cookieHeader, ws.data.id, {
        name: 'Team 2',
        identifier: 'ABCDE',
      })
      expect(res2.status).toBe(201)
    })

    it('should return 403 for non-workspace member', async () => {
      const app = createApp()
      const owner = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const other = await createAuthenticatedUser(app, {
        email: 'other@test.com',
      })

      const { data: ws } = await createWorkspace(app, owner.cookieHeader)

      const { res } = await createTeam(app, other.cookieHeader, ws.data.id, {
        identifier: 'ENG',
      })

      expect(res.status).toBe(403)
    })

    it('should return 403 for member without admin/owner role', async () => {
      const app = createApp()
      const owner = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const member = await createAuthenticatedUser(app, {
        email: 'member@test.com',
      })

      const { data: ws } = await createWorkspace(app, owner.cookieHeader)
      const memberUserId = await getUserId(app, member.cookieHeader)

      // Add as regular member
      await request(
        app,
        'POST',
        `/api/workspaces/${ws.data.id}/members`,
        owner.cookieHeader,
        { userId: memberUserId, role: 'member' },
      )

      const { res } = await createTeam(app, member.cookieHeader, ws.data.id, {
        identifier: 'ENG',
      })

      expect(res.status).toBe(403)
    })
  })

  describe('GET /api/workspaces/:workspaceId/teams', () => {
    it('should list teams in workspace', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: ws } = await createWorkspace(app, cookieHeader)

      await createTeam(app, cookieHeader, ws.data.id, {
        name: 'Engineering',
        identifier: 'ENG',
      })
      await createTeam(app, cookieHeader, ws.data.id, {
        name: 'Design',
        identifier: 'DES',
      })

      const res = await request(
        app,
        'GET',
        `/api/workspaces/${ws.data.id}/teams`,
        cookieHeader,
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data).toHaveLength(2)
    })
  })

  describe('GET /api/workspaces/:workspaceId/teams/:teamId', () => {
    it('should get team detail', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: ws } = await createWorkspace(app, cookieHeader)
      const { data: team } = await createTeam(app, cookieHeader, ws.data.id)

      const res = await request(
        app,
        'GET',
        `/api/workspaces/${ws.data.id}/teams/${team.data.id}`,
        cookieHeader,
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data.id).toBe(team.data.id)
      expect(data.data.name).toBe('Engineering')
    })

    it('should return 404 for non-existent team', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: ws } = await createWorkspace(app, cookieHeader)

      const res = await request(
        app,
        'GET',
        `/api/workspaces/${ws.data.id}/teams/nonexistent-id`,
        cookieHeader,
      )

      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /api/workspaces/:workspaceId/teams/:teamId', () => {
    it('should update team name', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: ws } = await createWorkspace(app, cookieHeader)
      const { data: team } = await createTeam(app, cookieHeader, ws.data.id)

      const res = await request(
        app,
        'PATCH',
        `/api/workspaces/${ws.data.id}/teams/${team.data.id}`,
        cookieHeader,
        { name: 'Backend Team' },
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data.name).toBe('Backend Team')
    })
  })

  describe('DELETE /api/workspaces/:workspaceId/teams/:teamId', () => {
    it('should delete team', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: ws } = await createWorkspace(app, cookieHeader)
      const { data: team } = await createTeam(app, cookieHeader, ws.data.id)

      const res = await request(
        app,
        'DELETE',
        `/api/workspaces/${ws.data.id}/teams/${team.data.id}`,
        cookieHeader,
      )

      expect(res.status).toBe(200)

      // Verify deleted
      const listRes = await request(
        app,
        'GET',
        `/api/workspaces/${ws.data.id}/teams`,
        cookieHeader,
      )
      const listData = await listRes.json()
      expect(listData.data).toHaveLength(0)
    })
  })

  describe('POST /api/workspaces/:workspaceId/teams/:teamId/members', () => {
    it('should add a workspace member to team', async () => {
      const app = createApp()
      const owner = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const member = await createAuthenticatedUser(app, {
        email: 'member@test.com',
      })

      const { data: ws } = await createWorkspace(app, owner.cookieHeader)
      const memberUserId = await getUserId(app, member.cookieHeader)

      // Add user to workspace first
      await request(
        app,
        'POST',
        `/api/workspaces/${ws.data.id}/members`,
        owner.cookieHeader,
        { userId: memberUserId, role: 'member' },
      )

      const { data: team } = await createTeam(
        app,
        owner.cookieHeader,
        ws.data.id,
      )

      const res = await request(
        app,
        'POST',
        `/api/workspaces/${ws.data.id}/teams/${team.data.id}/members`,
        owner.cookieHeader,
        { userId: memberUserId },
      )
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.data.teamId).toBe(team.data.id)
      expect(data.data.userId).toBe(memberUserId)
    })

    it('should return 403 when adding non-workspace member to team', async () => {
      const app = createApp()
      const owner = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const outsider = await createAuthenticatedUser(app, {
        email: 'outsider@test.com',
      })

      const { data: ws } = await createWorkspace(app, owner.cookieHeader)
      const outsiderUserId = await getUserId(app, outsider.cookieHeader)

      const { data: team } = await createTeam(
        app,
        owner.cookieHeader,
        ws.data.id,
      )

      const res = await request(
        app,
        'POST',
        `/api/workspaces/${ws.data.id}/teams/${team.data.id}/members`,
        owner.cookieHeader,
        { userId: outsiderUserId },
      )

      expect(res.status).toBe(403)
    })

    it('should return 409 for duplicate team member', async () => {
      const app = createApp()
      const owner = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const member = await createAuthenticatedUser(app, {
        email: 'member@test.com',
      })

      const { data: ws } = await createWorkspace(app, owner.cookieHeader)
      const memberUserId = await getUserId(app, member.cookieHeader)

      // Add user to workspace
      await request(
        app,
        'POST',
        `/api/workspaces/${ws.data.id}/members`,
        owner.cookieHeader,
        { userId: memberUserId, role: 'member' },
      )

      const { data: team } = await createTeam(
        app,
        owner.cookieHeader,
        ws.data.id,
      )

      // Add to team (first time)
      await request(
        app,
        'POST',
        `/api/workspaces/${ws.data.id}/teams/${team.data.id}/members`,
        owner.cookieHeader,
        { userId: memberUserId },
      )

      // Try to add again
      const res = await request(
        app,
        'POST',
        `/api/workspaces/${ws.data.id}/teams/${team.data.id}/members`,
        owner.cookieHeader,
        { userId: memberUserId },
      )

      expect(res.status).toBe(409)
    })
  })

  describe('GET /api/workspaces/:workspaceId/teams/:teamId/members', () => {
    it('should list team members with user info', async () => {
      const app = createApp()
      const owner = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
        name: 'Owner',
      })

      const { data: ws } = await createWorkspace(app, owner.cookieHeader)
      const { data: team } = await createTeam(
        app,
        owner.cookieHeader,
        ws.data.id,
      )

      const res = await request(
        app,
        'GET',
        `/api/workspaces/${ws.data.id}/teams/${team.data.id}/members`,
        owner.cookieHeader,
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      // Creator is auto-added as team member
      expect(data.data).toHaveLength(1)
      expect(data.data[0].user).toBeDefined()
      expect(data.data[0].user.email).toBe('owner@test.com')
      expect(data.data[0].user.name).toBe('Owner')
    })

    it('should list multiple team members', async () => {
      const app = createApp()
      const owner = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
        name: 'Owner',
      })
      const member = await createAuthenticatedUser(app, {
        email: 'member@test.com',
        name: 'Member',
      })

      const { data: ws } = await createWorkspace(app, owner.cookieHeader)
      const memberUserId = await getUserId(app, member.cookieHeader)

      // Add user to workspace
      await request(
        app,
        'POST',
        `/api/workspaces/${ws.data.id}/members`,
        owner.cookieHeader,
        { userId: memberUserId, role: 'member' },
      )

      const { data: team } = await createTeam(
        app,
        owner.cookieHeader,
        ws.data.id,
      )

      // Add member to team
      await request(
        app,
        'POST',
        `/api/workspaces/${ws.data.id}/teams/${team.data.id}/members`,
        owner.cookieHeader,
        { userId: memberUserId },
      )

      const res = await request(
        app,
        'GET',
        `/api/workspaces/${ws.data.id}/teams/${team.data.id}/members`,
        owner.cookieHeader,
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data).toHaveLength(2)
    })
  })
})
