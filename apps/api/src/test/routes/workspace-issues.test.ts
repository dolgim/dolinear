import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from '../../auth.ts'
import { authMiddleware } from '../../middleware/auth.ts'
import { workspacesRoute } from '../../routes/workspaces.ts'
import { createTestDb, cleanupDatabase } from '../helpers.ts'
import { createAuthenticatedUser } from '../auth-helpers.ts'
import type { Env } from '../../types.ts'

describe('Workspace Issues Routes', () => {
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

  async function createIssue(
    app: Hono<Env>,
    cookieHeader: string,
    workspaceId: string,
    teamId: string,
    overrides?: Record<string, unknown>,
  ) {
    const body = { title: 'Test Issue', ...overrides }
    const res = await request(
      app,
      'POST',
      `/api/workspaces/${workspaceId}/teams/${teamId}/issues`,
      cookieHeader,
      body,
    )
    const data = await res.json()
    return { res, data }
  }

  async function setupWorkspaceAndTeam(app: Hono<Env>, cookieHeader: string) {
    const { data: ws } = await createWorkspace(app, cookieHeader)
    const { data: team } = await createTeam(app, cookieHeader, ws.data.id)
    return { workspaceId: ws.data.id, teamId: team.data.id }
  }

  function workspaceIssuesPath(workspaceId: string) {
    return `/api/workspaces/${workspaceId}/issues`
  }

  describe('GET /workspaces/:workspaceId/issues — List workspace issues', () => {
    it('should list all issues across teams in a workspace', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: ws } = await createWorkspace(app, cookieHeader)
      const workspaceId = ws.data.id

      // Create two teams
      const { data: team1 } = await createTeam(app, cookieHeader, workspaceId, {
        name: 'Engineering',
        identifier: 'ENG',
      })
      const { data: team2 } = await createTeam(app, cookieHeader, workspaceId, {
        name: 'Design',
        identifier: 'DES',
      })

      // Create issues in both teams
      await createIssue(app, cookieHeader, workspaceId, team1.data.id, {
        title: 'ENG Issue 1',
      })
      await createIssue(app, cookieHeader, workspaceId, team2.data.id, {
        title: 'DES Issue 1',
      })
      await createIssue(app, cookieHeader, workspaceId, team1.data.id, {
        title: 'ENG Issue 2',
      })

      const res = await request(
        app,
        'GET',
        workspaceIssuesPath(workspaceId),
        cookieHeader,
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data).toHaveLength(3)
      expect(data.total).toBe(3)
      expect(data.page).toBe(1)
      expect(data.hasMore).toBe(false)
    })

    it('should include team and workflowState info in response', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      await createIssue(app, cookieHeader, workspaceId, teamId, {
        title: 'Test Issue',
      })

      const res = await request(
        app,
        'GET',
        workspaceIssuesPath(workspaceId),
        cookieHeader,
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data).toHaveLength(1)

      const issue = data.data[0]
      expect(issue.team).toBeDefined()
      expect(issue.team.identifier).toBe('ENG')
      expect(issue.team.name).toBe('Engineering')
      expect(issue.workflowState).toBeDefined()
      expect(issue.workflowState.name).toBeDefined()
      expect(issue.workflowState.color).toBeDefined()
      expect(issue.workflowState.type).toBe('backlog')
    })

    it('should return empty array when workspace has no teams', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: ws } = await createWorkspace(app, cookieHeader)

      const res = await request(
        app,
        'GET',
        workspaceIssuesPath(ws.data.id),
        cookieHeader,
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data).toHaveLength(0)
      expect(data.total).toBe(0)
    })

    it('should filter by assigneeId', async () => {
      const app = createApp()
      const { cookieHeader: ownerCookie } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { cookieHeader: memberCookie } = await createAuthenticatedUser(
        app,
        {
          email: 'member@test.com',
        },
      )

      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        ownerCookie,
      )

      // Get member user ID
      const memberSessionRes = await app.request('/api/auth/get-session', {
        method: 'GET',
        headers: { Cookie: memberCookie },
      })
      const memberSession = await memberSessionRes.json()
      const memberId = memberSession.user.id

      // Add member to workspace
      await request(
        app,
        'POST',
        `/api/workspaces/${workspaceId}/members`,
        ownerCookie,
        { userId: memberId, role: 'member' },
      )

      await createIssue(app, ownerCookie, workspaceId, teamId, {
        title: 'Unassigned Issue',
      })
      await createIssue(app, ownerCookie, workspaceId, teamId, {
        title: 'Assigned Issue',
        assigneeId: memberId,
      })

      const res = await request(
        app,
        'GET',
        `${workspaceIssuesPath(workspaceId)}?assigneeId=${memberId}`,
        ownerCookie,
      )
      const data = await res.json()

      expect(data.data).toHaveLength(1)
      expect(data.data[0].title).toBe('Assigned Issue')
    })

    it('should filter by q (title search)', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      await createIssue(app, cookieHeader, workspaceId, teamId, {
        title: 'Fix login bug',
      })
      await createIssue(app, cookieHeader, workspaceId, teamId, {
        title: 'Add signup feature',
      })
      await createIssue(app, cookieHeader, workspaceId, teamId, {
        title: 'Update login page',
      })

      const res = await request(
        app,
        'GET',
        `${workspaceIssuesPath(workspaceId)}?q=login`,
        cookieHeader,
      )
      const data = await res.json()

      expect(data.data).toHaveLength(2)
      const titles = data.data.map((d: { title: string }) => d.title)
      expect(titles).toContain('Fix login bug')
      expect(titles).toContain('Update login page')
    })

    it('should filter by q case-insensitively', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      await createIssue(app, cookieHeader, workspaceId, teamId, {
        title: 'Fix LOGIN Bug',
      })

      const res = await request(
        app,
        'GET',
        `${workspaceIssuesPath(workspaceId)}?q=login`,
        cookieHeader,
      )
      const data = await res.json()

      expect(data.data).toHaveLength(1)
      expect(data.data[0].title).toBe('Fix LOGIN Bug')
    })

    it('should filter by stateType', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      // Get states
      const statesRes = await request(
        app,
        'GET',
        `/api/workspaces/${workspaceId}/teams/${teamId}/states`,
        cookieHeader,
      )
      const statesData = await statesRes.json()
      const inProgressState = statesData.data.find(
        (s: { name: string }) => s.name === 'In Progress',
      )

      // Create issues with different states
      await createIssue(app, cookieHeader, workspaceId, teamId, {
        title: 'Backlog Issue',
      })
      await createIssue(app, cookieHeader, workspaceId, teamId, {
        title: 'Started Issue',
        workflowStateId: inProgressState.id,
      })

      const res = await request(
        app,
        'GET',
        `${workspaceIssuesPath(workspaceId)}?stateType=started`,
        cookieHeader,
      )
      const data = await res.json()

      expect(data.data).toHaveLength(1)
      expect(data.data[0].title).toBe('Started Issue')
    })

    it('should filter by priority', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      await createIssue(app, cookieHeader, workspaceId, teamId, {
        title: 'Normal Issue',
        priority: 0,
      })
      await createIssue(app, cookieHeader, workspaceId, teamId, {
        title: 'Urgent Issue',
        priority: 1,
      })

      const res = await request(
        app,
        'GET',
        `${workspaceIssuesPath(workspaceId)}?priority=1`,
        cookieHeader,
      )
      const data = await res.json()

      expect(data.data).toHaveLength(1)
      expect(data.data[0].title).toBe('Urgent Issue')
    })

    it('should combine multiple filters', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: ws } = await createWorkspace(app, cookieHeader)
      const workspaceId = ws.data.id

      const { data: team1 } = await createTeam(app, cookieHeader, workspaceId, {
        name: 'Engineering',
        identifier: 'ENG',
      })
      const { data: team2 } = await createTeam(app, cookieHeader, workspaceId, {
        name: 'Design',
        identifier: 'DES',
      })

      // Create various issues
      await createIssue(app, cookieHeader, workspaceId, team1.data.id, {
        title: 'Fix login bug',
        priority: 1,
      })
      await createIssue(app, cookieHeader, workspaceId, team1.data.id, {
        title: 'Fix signup bug',
        priority: 1,
      })
      await createIssue(app, cookieHeader, workspaceId, team2.data.id, {
        title: 'Design login page',
        priority: 0,
      })
      await createIssue(app, cookieHeader, workspaceId, team2.data.id, {
        title: 'Fix login animation',
        priority: 1,
      })

      // Filter: q=login AND priority=1
      const res = await request(
        app,
        'GET',
        `${workspaceIssuesPath(workspaceId)}?q=login&priority=1`,
        cookieHeader,
      )
      const data = await res.json()

      expect(data.data).toHaveLength(2)
      const titles = data.data.map((d: { title: string }) => d.title)
      expect(titles).toContain('Fix login bug')
      expect(titles).toContain('Fix login animation')
    })

    it('should support pagination', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      // Create 5 issues
      for (let i = 1; i <= 5; i++) {
        await createIssue(app, cookieHeader, workspaceId, teamId, {
          title: `Issue ${i}`,
        })
      }

      // Page 1 with pageSize=2
      const res1 = await request(
        app,
        'GET',
        `${workspaceIssuesPath(workspaceId)}?page=1&pageSize=2`,
        cookieHeader,
      )
      const data1 = await res1.json()

      expect(data1.data).toHaveLength(2)
      expect(data1.total).toBe(5)
      expect(data1.hasMore).toBe(true)

      // Page 3 with pageSize=2
      const res3 = await request(
        app,
        'GET',
        `${workspaceIssuesPath(workspaceId)}?page=3&pageSize=2`,
        cookieHeader,
      )
      const data3 = await res3.json()

      expect(data3.data).toHaveLength(1)
      expect(data3.hasMore).toBe(false)
    })

    it('should support sorting by createdAt desc', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      await createIssue(app, cookieHeader, workspaceId, teamId, {
        title: 'First',
      })
      await createIssue(app, cookieHeader, workspaceId, teamId, {
        title: 'Second',
      })

      const res = await request(
        app,
        'GET',
        `${workspaceIssuesPath(workspaceId)}?sort=createdAt&order=desc`,
        cookieHeader,
      )
      const data = await res.json()

      expect(data.data[0].title).toBe('Second')
      expect(data.data[1].title).toBe('First')
    })

    it('should require workspace membership', async () => {
      const app = createApp()
      const { cookieHeader: ownerCookie } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { cookieHeader: otherCookie } = await createAuthenticatedUser(app, {
        email: 'other@test.com',
      })

      const { data: ws } = await createWorkspace(app, ownerCookie)

      const res = await request(
        app,
        'GET',
        workspaceIssuesPath(ws.data.id),
        otherCookie,
      )

      expect(res.status).toBe(403)
    })
  })
})
