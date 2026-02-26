import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from '../../auth.ts'
import { authMiddleware } from '../../middleware/auth.ts'
import { workspacesRoute } from '../../routes/workspaces.ts'
import { createTestDb, cleanupDatabase } from '../helpers.ts'
import { createAuthenticatedUser } from '../auth-helpers.ts'
import { DEFAULT_WORKFLOW_STATES } from '../../routes/workflow-states.ts'
import type { Env } from '../../types.ts'

describe('Workflow State Routes', () => {
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

  function statesPath(workspaceId: string, teamId: string) {
    return `/api/workspaces/${workspaceId}/teams/${teamId}/states`
  }

  describe('Default workflow states on team creation', () => {
    it('should create 6 default workflow states when a team is created', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: ws } = await createWorkspace(app, cookieHeader)
      const { data: team } = await createTeam(app, cookieHeader, ws.data.id)

      const res = await request(
        app,
        'GET',
        statesPath(ws.data.id, team.data.id),
        cookieHeader,
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data).toHaveLength(6)

      // Verify all default states exist with correct properties
      const stateNames = data.data.map(
        (s: { name: string }) => s.name,
      ) as string[]
      for (const defaultState of DEFAULT_WORKFLOW_STATES) {
        expect(stateNames).toContain(defaultState.name)
      }

      // Verify ordering by position
      for (let i = 0; i < data.data.length - 1; i++) {
        expect(data.data[i].position).toBeLessThanOrEqual(
          data.data[i + 1].position,
        )
      }
    })
  })

  describe('GET /api/workspaces/:workspaceId/teams/:teamId/states', () => {
    it('should list workflow states for a team', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: ws } = await createWorkspace(app, cookieHeader)
      const { data: team } = await createTeam(app, cookieHeader, ws.data.id)

      const res = await request(
        app,
        'GET',
        statesPath(ws.data.id, team.data.id),
        cookieHeader,
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data).toHaveLength(6)
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
        statesPath(ws.data.id, 'nonexistent-team-id'),
        cookieHeader,
      )

      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/workspaces/:workspaceId/teams/:teamId/states', () => {
    it('should create a workflow state', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: ws } = await createWorkspace(app, cookieHeader)
      const { data: team } = await createTeam(app, cookieHeader, ws.data.id)

      const res = await request(
        app,
        'POST',
        statesPath(ws.data.id, team.data.id),
        cookieHeader,
        {
          name: 'Testing',
          color: '#ff0000',
          type: 'started',
          position: 10,
        },
      )
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.data.name).toBe('Testing')
      expect(data.data.color).toBe('#ff0000')
      expect(data.data.type).toBe('started')
      expect(data.data.position).toBe(10)
      expect(data.data.teamId).toBe(team.data.id)
    })

    it('should return 409 for duplicate name in same team', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: ws } = await createWorkspace(app, cookieHeader)
      const { data: team } = await createTeam(app, cookieHeader, ws.data.id)

      // 'Backlog' already exists as a default state
      const res = await request(
        app,
        'POST',
        statesPath(ws.data.id, team.data.id),
        cookieHeader,
        {
          name: 'Backlog',
          color: '#000000',
          type: 'backlog',
          position: 10,
        },
      )

      expect(res.status).toBe(409)
    })

    it('should return 400 for invalid type', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: ws } = await createWorkspace(app, cookieHeader)
      const { data: team } = await createTeam(app, cookieHeader, ws.data.id)

      const res = await request(
        app,
        'POST',
        statesPath(ws.data.id, team.data.id),
        cookieHeader,
        {
          name: 'Invalid',
          color: '#000000',
          type: 'invalid_type',
          position: 10,
        },
      )

      expect(res.status).toBe(400)
    })
  })

  describe('PATCH /api/workspaces/:workspaceId/teams/:teamId/states/:stateId', () => {
    it('should update a workflow state', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: ws } = await createWorkspace(app, cookieHeader)
      const { data: team } = await createTeam(app, cookieHeader, ws.data.id)

      // Get the default states
      const listRes = await request(
        app,
        'GET',
        statesPath(ws.data.id, team.data.id),
        cookieHeader,
      )
      const listData = await listRes.json()
      const backlogState = listData.data.find(
        (s: { name: string }) => s.name === 'Backlog',
      )

      const res = await request(
        app,
        'PATCH',
        `${statesPath(ws.data.id, team.data.id)}/${backlogState.id}`,
        cookieHeader,
        { name: 'Icebox', color: '#cccccc' },
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data.name).toBe('Icebox')
      expect(data.data.color).toBe('#cccccc')
      expect(data.data.type).toBe('backlog') // type unchanged
    })

    it('should return 404 for non-existent state', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: ws } = await createWorkspace(app, cookieHeader)
      const { data: team } = await createTeam(app, cookieHeader, ws.data.id)

      const res = await request(
        app,
        'PATCH',
        `${statesPath(ws.data.id, team.data.id)}/nonexistent-id`,
        cookieHeader,
        { name: 'Updated' },
      )

      expect(res.status).toBe(404)
    })

    it('should return 409 for duplicate name on update', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: ws } = await createWorkspace(app, cookieHeader)
      const { data: team } = await createTeam(app, cookieHeader, ws.data.id)

      // Get the default states
      const listRes = await request(
        app,
        'GET',
        statesPath(ws.data.id, team.data.id),
        cookieHeader,
      )
      const listData = await listRes.json()
      const backlogState = listData.data.find(
        (s: { name: string }) => s.name === 'Backlog',
      )

      // Try to rename Backlog to Todo (which already exists)
      const res = await request(
        app,
        'PATCH',
        `${statesPath(ws.data.id, team.data.id)}/${backlogState.id}`,
        cookieHeader,
        { name: 'Todo' },
      )

      expect(res.status).toBe(409)
    })
  })

  describe('DELETE /api/workspaces/:workspaceId/teams/:teamId/states/:stateId', () => {
    it('should delete a workflow state', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: ws } = await createWorkspace(app, cookieHeader)
      const { data: team } = await createTeam(app, cookieHeader, ws.data.id)

      // Get a state to delete
      const listRes = await request(
        app,
        'GET',
        statesPath(ws.data.id, team.data.id),
        cookieHeader,
      )
      const listData = await listRes.json()
      const backlogState = listData.data.find(
        (s: { name: string }) => s.name === 'Backlog',
      )

      const res = await request(
        app,
        'DELETE',
        `${statesPath(ws.data.id, team.data.id)}/${backlogState.id}`,
        cookieHeader,
      )

      expect(res.status).toBe(200)

      // Verify deleted
      const afterRes = await request(
        app,
        'GET',
        statesPath(ws.data.id, team.data.id),
        cookieHeader,
      )
      const afterData = await afterRes.json()
      expect(afterData.data).toHaveLength(5)
    })

    it('should return 404 for non-existent state', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: ws } = await createWorkspace(app, cookieHeader)
      const { data: team } = await createTeam(app, cookieHeader, ws.data.id)

      const res = await request(
        app,
        'DELETE',
        `${statesPath(ws.data.id, team.data.id)}/nonexistent-id`,
        cookieHeader,
      )

      expect(res.status).toBe(404)
    })
  })
})
