import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from '../../auth.js'
import { authMiddleware } from '../../middleware/auth.js'
import { workspacesRoute } from '../../routes/workspaces.js'
import { createTestDb, cleanupDatabase } from '../helpers.js'
import { createAuthenticatedUser } from '../auth-helpers.js'
import type { Env } from '../../types.js'

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

  async function getUserId(app: Hono<Env>, cookieHeader: string) {
    const sessionRes = await app.request('/api/auth/get-session', {
      headers: { Cookie: cookieHeader },
    })
    const session = await sessionRes.json()
    return session.user.id as string
  }

  async function createTeam(
    app: Hono<Env>,
    workspaceId: string,
    cookieHeader: string,
    team: { name: string; identifier: string } = {
      name: 'Engineering',
      identifier: 'ENG',
    },
  ) {
    const res = await request(
      app,
      'POST',
      `/api/workspaces/${workspaceId}/teams`,
      cookieHeader,
      team,
    )
    const data = await res.json()
    return { res, data }
  }

  describe('POST /api/workspaces/:workspaceId/teams', () => {
    it('should create a team', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: wsData } = await createWorkspace(app, cookieHeader)

      const { res, data } = await createTeam(
        app,
        wsData.data.id,
        cookieHeader,
        { name: 'Engineering', identifier: 'ENG' },
      )

      expect(res.status).toBe(201)
      expect(data.data.name).toBe('Engineering')
      expect(data.data.identifier).toBe('ENG')
      expect(data.data.workspaceId).toBe(wsData.data.id)
      expect(data.data.issueCounter).toBe(0)
      expect(data.data.id).toBeDefined()
    })

    it('should return 409 for duplicate identifier in same workspace', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: wsData } = await createWorkspace(app, cookieHeader)

      await createTeam(app, wsData.data.id, cookieHeader, {
        name: 'Engineering',
        identifier: 'ENG',
      })

      const { res } = await createTeam(app, wsData.data.id, cookieHeader, {
        name: 'Engineering 2',
        identifier: 'ENG',
      })

      expect(res.status).toBe(409)
    })

    it('should allow same identifier in different workspaces', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: ws1Data } = await createWorkspace(
        app,
        cookieHeader,
        'Workspace 1',
      )
      const { data: ws2Data } = await createWorkspace(
        app,
        cookieHeader,
        'Workspace 2',
      )

      const { res: res1 } = await createTeam(
        app,
        ws1Data.data.id,
        cookieHeader,
        { name: 'Engineering', identifier: 'ENG' },
      )
      const { res: res2 } = await createTeam(
        app,
        ws2Data.data.id,
        cookieHeader,
        { name: 'Engineering', identifier: 'ENG' },
      )

      expect(res1.status).toBe(201)
      expect(res2.status).toBe(201)
    })

    it('should return 400 for invalid identifier format (lowercase)', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: wsData } = await createWorkspace(app, cookieHeader)

      const { res } = await createTeam(app, wsData.data.id, cookieHeader, {
        name: 'Engineering',
        identifier: 'eng',
      })

      expect(res.status).toBe(400)
    })

    it('should return 400 for identifier too short', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: wsData } = await createWorkspace(app, cookieHeader)

      const { res } = await createTeam(app, wsData.data.id, cookieHeader, {
        name: 'Engineering',
        identifier: 'E',
      })

      expect(res.status).toBe(400)
    })

    it('should return 400 for identifier too long', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: wsData } = await createWorkspace(app, cookieHeader)

      const { res } = await createTeam(app, wsData.data.id, cookieHeader, {
        name: 'Engineering',
        identifier: 'TOOLONG',
      })

      expect(res.status).toBe(400)
    })

    it('should return 403 for non-workspace member', async () => {
      const app = createApp()
      const owner = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const other = await createAuthenticatedUser(app, {
        email: 'other@test.com',
      })

      const { data: wsData } = await createWorkspace(app, owner.cookieHeader)

      const { res } = await createTeam(
        app,
        wsData.data.id,
        other.cookieHeader,
        { name: 'Engineering', identifier: 'ENG' },
      )

      expect(res.status).toBe(403)
    })
  })

  describe('GET /api/workspaces/:workspaceId/teams', () => {
    it('should list teams in workspace', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: wsData } = await createWorkspace(app, cookieHeader)

      await createTeam(app, wsData.data.id, cookieHeader, {
        name: 'Engineering',
        identifier: 'ENG',
      })
      await createTeam(app, wsData.data.id, cookieHeader, {
        name: 'Design',
        identifier: 'DES',
      })

      const res = await request(
        app,
        'GET',
        `/api/workspaces/${wsData.data.id}/teams`,
        cookieHeader,
      )
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data).toHaveLength(2)
    })
  })

  describe('GET /api/workspaces/:workspaceId/teams/:teamId', () => {
    it('should return team detail', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: wsData } = await createWorkspace(app, cookieHeader)
      const { data: teamData } = await createTeam(
        app,
        wsData.data.id,
        cookieHeader,
      )

      const res = await request(
        app,
        'GET',
        `/api/workspaces/${wsData.data.id}/teams/${teamData.data.id}`,
        cookieHeader,
      )
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data.id).toBe(teamData.data.id)
      expect(body.data.name).toBe('Engineering')
    })

    it('should return 404 for non-existent team', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: wsData } = await createWorkspace(app, cookieHeader)

      const res = await request(
        app,
        'GET',
        `/api/workspaces/${wsData.data.id}/teams/non-existent-id`,
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
      const { data: wsData } = await createWorkspace(app, cookieHeader)
      const { data: teamData } = await createTeam(
        app,
        wsData.data.id,
        cookieHeader,
      )

      const res = await request(
        app,
        'PATCH',
        `/api/workspaces/${wsData.data.id}/teams/${teamData.data.id}`,
        cookieHeader,
        { name: 'Updated Engineering' },
      )
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data.name).toBe('Updated Engineering')
      expect(body.data.identifier).toBe('ENG') // identifier unchanged
    })
  })

  describe('DELETE /api/workspaces/:workspaceId/teams/:teamId', () => {
    it('should delete team for workspace owner', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: wsData } = await createWorkspace(app, cookieHeader)
      const { data: teamData } = await createTeam(
        app,
        wsData.data.id,
        cookieHeader,
      )

      const res = await request(
        app,
        'DELETE',
        `/api/workspaces/${wsData.data.id}/teams/${teamData.data.id}`,
        cookieHeader,
      )

      expect(res.status).toBe(200)

      // Verify team is gone
      const listRes = await request(
        app,
        'GET',
        `/api/workspaces/${wsData.data.id}/teams`,
        cookieHeader,
      )
      const listData = await listRes.json()
      expect(listData.data).toHaveLength(0)
    })

    it('should return 403 for regular member trying to delete', async () => {
      const app = createApp()
      const owner = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const member = await createAuthenticatedUser(app, {
        email: 'member@test.com',
      })

      const { data: wsData } = await createWorkspace(app, owner.cookieHeader)

      // Add member to workspace
      const memberId = await getUserId(app, member.cookieHeader)
      await request(
        app,
        'POST',
        `/api/workspaces/${wsData.data.id}/members`,
        owner.cookieHeader,
        { userId: memberId, role: 'member' },
      )

      const { data: teamData } = await createTeam(
        app,
        wsData.data.id,
        owner.cookieHeader,
      )

      const res = await request(
        app,
        'DELETE',
        `/api/workspaces/${wsData.data.id}/teams/${teamData.data.id}`,
        member.cookieHeader,
      )

      expect(res.status).toBe(403)
    })
  })

  describe('POST /api/workspaces/:workspaceId/teams/:teamId/members', () => {
    it('should add a workspace member to the team', async () => {
      const app = createApp()
      const owner = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const member = await createAuthenticatedUser(app, {
        email: 'member@test.com',
      })

      const { data: wsData } = await createWorkspace(app, owner.cookieHeader)

      // Add member to workspace
      const memberId = await getUserId(app, member.cookieHeader)
      await request(
        app,
        'POST',
        `/api/workspaces/${wsData.data.id}/members`,
        owner.cookieHeader,
        { userId: memberId, role: 'member' },
      )

      const { data: teamData } = await createTeam(
        app,
        wsData.data.id,
        owner.cookieHeader,
      )

      const res = await request(
        app,
        'POST',
        `/api/workspaces/${wsData.data.id}/teams/${teamData.data.id}/members`,
        owner.cookieHeader,
        { userId: memberId },
      )
      const body = await res.json()

      expect(res.status).toBe(201)
      expect(body.data.teamId).toBe(teamData.data.id)
      expect(body.data.userId).toBe(memberId)
    })

    it('should return 403 when adding non-workspace member to team', async () => {
      const app = createApp()
      const owner = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const outsider = await createAuthenticatedUser(app, {
        email: 'outsider@test.com',
      })

      const { data: wsData } = await createWorkspace(app, owner.cookieHeader)
      const { data: teamData } = await createTeam(
        app,
        wsData.data.id,
        owner.cookieHeader,
      )

      const outsiderId = await getUserId(app, outsider.cookieHeader)

      const res = await request(
        app,
        'POST',
        `/api/workspaces/${wsData.data.id}/teams/${teamData.data.id}/members`,
        owner.cookieHeader,
        { userId: outsiderId },
      )

      expect(res.status).toBe(403)
    })

    it('should return 409 when adding duplicate team member', async () => {
      const app = createApp()
      const owner = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })

      const { data: wsData } = await createWorkspace(app, owner.cookieHeader)
      const { data: teamData } = await createTeam(
        app,
        wsData.data.id,
        owner.cookieHeader,
      )

      const ownerId = await getUserId(app, owner.cookieHeader)

      // Add owner to team
      await request(
        app,
        'POST',
        `/api/workspaces/${wsData.data.id}/teams/${teamData.data.id}/members`,
        owner.cookieHeader,
        { userId: ownerId },
      )

      // Try adding again
      const res = await request(
        app,
        'POST',
        `/api/workspaces/${wsData.data.id}/teams/${teamData.data.id}/members`,
        owner.cookieHeader,
        { userId: ownerId },
      )

      expect(res.status).toBe(409)
    })
  })

  describe('GET /api/workspaces/:workspaceId/teams/:teamId/members', () => {
    it('should list team members with user info', async () => {
      const app = createApp()
      const owner = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
        name: 'Owner User',
      })

      const { data: wsData } = await createWorkspace(app, owner.cookieHeader)
      const { data: teamData } = await createTeam(
        app,
        wsData.data.id,
        owner.cookieHeader,
      )

      const ownerId = await getUserId(app, owner.cookieHeader)

      await request(
        app,
        'POST',
        `/api/workspaces/${wsData.data.id}/teams/${teamData.data.id}/members`,
        owner.cookieHeader,
        { userId: ownerId },
      )

      const res = await request(
        app,
        'GET',
        `/api/workspaces/${wsData.data.id}/teams/${teamData.data.id}/members`,
        owner.cookieHeader,
      )
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data).toHaveLength(1)
      expect(body.data[0].user).toBeDefined()
      expect(body.data[0].user.email).toBe('owner@test.com')
      expect(body.data[0].user.name).toBe('Owner User')
    })
  })
})
