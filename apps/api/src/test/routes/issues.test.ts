import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from '../../auth.ts'
import { authMiddleware } from '../../middleware/auth.ts'
import { workspacesRoute } from '../../routes/workspaces.ts'
import { createTestDb, cleanupDatabase } from '../helpers.ts'
import { createAuthenticatedUser } from '../auth-helpers.ts'
import type { Env } from '../../types.ts'

describe('Issue Routes', () => {
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

  function issuesPath(workspaceId: string, teamId: string) {
    return `/api/workspaces/${workspaceId}/teams/${teamId}/issues`
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
      issuesPath(workspaceId, teamId),
      cookieHeader,
      body,
    )
    const data = await res.json()
    return { res, data }
  }

  async function createLabel(
    app: Hono<Env>,
    cookieHeader: string,
    workspaceId: string,
    options?: { name?: string; color?: string },
  ) {
    const name = options?.name ?? 'Bug'
    const color = options?.color ?? '#ff0000'
    const res = await request(
      app,
      'POST',
      `/api/workspaces/${workspaceId}/labels`,
      cookieHeader,
      { name, color },
    )
    const data = await res.json()
    return { res, data }
  }

  // Helper to set up workspace + team
  async function setupWorkspaceAndTeam(app: Hono<Env>, cookieHeader: string) {
    const { data: ws } = await createWorkspace(app, cookieHeader)
    const { data: team } = await createTeam(app, cookieHeader, ws.data.id)
    return { workspaceId: ws.data.id, teamId: team.data.id }
  }

  describe('POST /issues — Create issue', () => {
    it('should create an issue with auto-generated identifier', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      const { res, data } = await createIssue(
        app,
        cookieHeader,
        workspaceId,
        teamId,
        { title: 'First Issue' },
      )

      expect(res.status).toBe(201)
      expect(data.data.title).toBe('First Issue')
      expect(data.data.identifier).toBe('ENG-1')
      expect(data.data.number).toBe(1)
      expect(data.data.priority).toBe(0)
      expect(data.data.teamId).toBe(teamId)
    })

    it('should auto-increment identifiers (ENG-1, ENG-2, ...)', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      const { data: d1 } = await createIssue(
        app,
        cookieHeader,
        workspaceId,
        teamId,
        { title: 'Issue 1' },
      )
      const { data: d2 } = await createIssue(
        app,
        cookieHeader,
        workspaceId,
        teamId,
        { title: 'Issue 2' },
      )
      const { data: d3 } = await createIssue(
        app,
        cookieHeader,
        workspaceId,
        teamId,
        { title: 'Issue 3' },
      )

      expect(d1.data.identifier).toBe('ENG-1')
      expect(d2.data.identifier).toBe('ENG-2')
      expect(d3.data.identifier).toBe('ENG-3')
    })

    it('should assign default Backlog workflow state', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      // Get the backlog state
      const statesRes = await request(
        app,
        'GET',
        `/api/workspaces/${workspaceId}/teams/${teamId}/states`,
        cookieHeader,
      )
      const statesData = await statesRes.json()
      const backlogState = statesData.data.find(
        (s: { type: string }) => s.type === 'backlog',
      )

      const { data } = await createIssue(app, cookieHeader, workspaceId, teamId)

      expect(data.data.workflowStateId).toBe(backlogState.id)
    })

    it('should place new issues at the top (lowest sortOrder)', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      const { data: d1 } = await createIssue(
        app,
        cookieHeader,
        workspaceId,
        teamId,
        { title: 'Issue 1' },
      )
      const { data: d2 } = await createIssue(
        app,
        cookieHeader,
        workspaceId,
        teamId,
        { title: 'Issue 2' },
      )

      // Newer issue should have lower sortOrder (appears at top)
      expect(d2.data.sortOrder).toBeLessThan(d1.data.sortOrder)
    })

    it('should accept custom priority', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      const { res, data } = await createIssue(
        app,
        cookieHeader,
        workspaceId,
        teamId,
        { title: 'Urgent Issue', priority: 1 },
      )

      expect(res.status).toBe(201)
      expect(data.data.priority).toBe(1)
    })

    it('should reject invalid priority', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      const { res } = await createIssue(
        app,
        cookieHeader,
        workspaceId,
        teamId,
        { title: 'Bad Priority', priority: 5 },
      )

      expect(res.status).toBe(400)
    })

    it('should create issue with labels', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )
      const { data: labelData } = await createLabel(
        app,
        cookieHeader,
        workspaceId,
        { name: 'Bug', color: '#ff0000' },
      )

      const { res, data } = await createIssue(
        app,
        cookieHeader,
        workspaceId,
        teamId,
        { title: 'Bug Report', labelIds: [labelData.data.id] },
      )

      expect(res.status).toBe(201)

      // Verify labels via GET
      const getRes = await request(
        app,
        'GET',
        `${issuesPath(workspaceId, teamId)}/${data.data.identifier}`,
        cookieHeader,
      )
      const getIssue = await getRes.json()
      expect(getIssue.data.labels).toHaveLength(1)
      expect(getIssue.data.labels[0].name).toBe('Bug')
    })
  })

  describe('GET /issues — List issues', () => {
    it('should list issues for a team', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      await createIssue(app, cookieHeader, workspaceId, teamId, {
        title: 'Issue 1',
      })
      await createIssue(app, cookieHeader, workspaceId, teamId, {
        title: 'Issue 2',
      })

      const res = await request(
        app,
        'GET',
        issuesPath(workspaceId, teamId),
        cookieHeader,
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data).toHaveLength(2)
      expect(data.total).toBe(2)
      expect(data.page).toBe(1)
      expect(data.hasMore).toBe(false)
    })

    it('should filter by workflowStateId', async () => {
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
      const todoState = statesData.data.find(
        (s: { name: string }) => s.name === 'Todo',
      )

      // Create issue in default (Backlog) state
      await createIssue(app, cookieHeader, workspaceId, teamId, {
        title: 'Backlog Issue',
      })

      // Create issue in Todo state
      await createIssue(app, cookieHeader, workspaceId, teamId, {
        title: 'Todo Issue',
        workflowStateId: todoState.id,
      })

      // Filter by todo state
      const res = await request(
        app,
        'GET',
        `${issuesPath(workspaceId, teamId)}?workflowStateId=${todoState.id}`,
        cookieHeader,
      )
      const data = await res.json()

      expect(data.data).toHaveLength(1)
      expect(data.data[0].title).toBe('Todo Issue')
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

      // Create issue in Backlog (backlog type)
      await createIssue(app, cookieHeader, workspaceId, teamId, {
        title: 'Backlog Issue',
      })

      // Create issue in In Progress (started type)
      await createIssue(app, cookieHeader, workspaceId, teamId, {
        title: 'Started Issue',
        workflowStateId: inProgressState.id,
      })

      // Filter by 'started' type
      const res = await request(
        app,
        'GET',
        `${issuesPath(workspaceId, teamId)}?stateType=started`,
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
        `${issuesPath(workspaceId, teamId)}?priority=1`,
        cookieHeader,
      )
      const data = await res.json()

      expect(data.data).toHaveLength(1)
      expect(data.data[0].title).toBe('Urgent Issue')
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

      // Add member to workspace
      // Get member's user ID first
      const memberSessionRes = await app.request('/api/auth/get-session', {
        method: 'GET',
        headers: { Cookie: memberCookie },
      })
      const memberSession = await memberSessionRes.json()
      const memberId = memberSession.user.id

      await request(
        app,
        'POST',
        `/api/workspaces/${workspaceId}/members`,
        ownerCookie,
        { userId: memberId, role: 'member' },
      )

      // Create issues
      await createIssue(app, ownerCookie, workspaceId, teamId, {
        title: 'Unassigned Issue',
      })
      await createIssue(app, ownerCookie, workspaceId, teamId, {
        title: 'Assigned Issue',
        assigneeId: memberId,
      })

      // Filter by assigneeId
      const res = await request(
        app,
        'GET',
        `${issuesPath(workspaceId, teamId)}?assigneeId=${memberId}`,
        ownerCookie,
      )
      const data = await res.json()

      expect(data.data).toHaveLength(1)
      expect(data.data[0].title).toBe('Assigned Issue')
    })

    it('should filter by labelId', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )
      const { data: labelData } = await createLabel(
        app,
        cookieHeader,
        workspaceId,
        { name: 'Bug', color: '#ff0000' },
      )

      await createIssue(app, cookieHeader, workspaceId, teamId, {
        title: 'Bug Issue',
        labelIds: [labelData.data.id],
      })
      await createIssue(app, cookieHeader, workspaceId, teamId, {
        title: 'Feature Issue',
      })

      const res = await request(
        app,
        'GET',
        `${issuesPath(workspaceId, teamId)}?labelId=${labelData.data.id}`,
        cookieHeader,
      )
      const data = await res.json()

      expect(data.data).toHaveLength(1)
      expect(data.data[0].title).toBe('Bug Issue')
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
        `${issuesPath(workspaceId, teamId)}?page=1&pageSize=2`,
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
        `${issuesPath(workspaceId, teamId)}?page=3&pageSize=2`,
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
        `${issuesPath(workspaceId, teamId)}?sort=createdAt&order=desc`,
        cookieHeader,
      )
      const data = await res.json()

      expect(data.data[0].title).toBe('Second')
      expect(data.data[1].title).toBe('First')
    })
  })

  describe('GET /issues/:identifier — Get issue by identifier', () => {
    it('should get an issue by identifier', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      const { data: created } = await createIssue(
        app,
        cookieHeader,
        workspaceId,
        teamId,
        { title: 'My Issue' },
      )

      const res = await request(
        app,
        'GET',
        `${issuesPath(workspaceId, teamId)}/${created.data.identifier}`,
        cookieHeader,
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data.title).toBe('My Issue')
      expect(data.data.identifier).toBe('ENG-1')
      expect(data.data.labels).toBeDefined()
    })

    it('should return 404 for non-existent identifier', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      const res = await request(
        app,
        'GET',
        `${issuesPath(workspaceId, teamId)}/ENG-999`,
        cookieHeader,
      )

      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /issues/:identifier — Update issue', () => {
    it('should update issue title', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      const { data: created } = await createIssue(
        app,
        cookieHeader,
        workspaceId,
        teamId,
        { title: 'Original' },
      )

      const res = await request(
        app,
        'PATCH',
        `${issuesPath(workspaceId, teamId)}/${created.data.identifier}`,
        cookieHeader,
        { title: 'Updated' },
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data.title).toBe('Updated')
    })

    it('should update priority', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      const { data: created } = await createIssue(
        app,
        cookieHeader,
        workspaceId,
        teamId,
      )

      const res = await request(
        app,
        'PATCH',
        `${issuesPath(workspaceId, teamId)}/${created.data.identifier}`,
        cookieHeader,
        { priority: 2 },
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data.priority).toBe(2)
    })

    it('should update workflow state', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      // Get Done state
      const statesRes = await request(
        app,
        'GET',
        `/api/workspaces/${workspaceId}/teams/${teamId}/states`,
        cookieHeader,
      )
      const statesData = await statesRes.json()
      const doneState = statesData.data.find(
        (s: { name: string }) => s.name === 'Done',
      )

      const { data: created } = await createIssue(
        app,
        cookieHeader,
        workspaceId,
        teamId,
      )

      const res = await request(
        app,
        'PATCH',
        `${issuesPath(workspaceId, teamId)}/${created.data.identifier}`,
        cookieHeader,
        { workflowStateId: doneState.id },
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data.workflowStateId).toBe(doneState.id)
    })

    it('should return 404 for non-existent identifier', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      const res = await request(
        app,
        'PATCH',
        `${issuesPath(workspaceId, teamId)}/ENG-999`,
        cookieHeader,
        { title: 'Updated' },
      )

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /issues/:identifier — Delete issue', () => {
    it('should delete an issue', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      const { data: created } = await createIssue(
        app,
        cookieHeader,
        workspaceId,
        teamId,
      )

      const delRes = await request(
        app,
        'DELETE',
        `${issuesPath(workspaceId, teamId)}/${created.data.identifier}`,
        cookieHeader,
      )

      expect(delRes.status).toBe(200)

      // Verify deleted
      const getRes = await request(
        app,
        'GET',
        `${issuesPath(workspaceId, teamId)}/${created.data.identifier}`,
        cookieHeader,
      )
      expect(getRes.status).toBe(404)
    })

    it('should return 404 for non-existent identifier', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      const res = await request(
        app,
        'DELETE',
        `${issuesPath(workspaceId, teamId)}/ENG-999`,
        cookieHeader,
      )

      expect(res.status).toBe(404)
    })
  })

  describe('Label attach/detach', () => {
    it('should attach a label to an issue', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      const { data: created } = await createIssue(
        app,
        cookieHeader,
        workspaceId,
        teamId,
      )
      const { data: labelData } = await createLabel(
        app,
        cookieHeader,
        workspaceId,
        { name: 'Feature', color: '#00ff00' },
      )

      const res = await request(
        app,
        'POST',
        `${issuesPath(workspaceId, teamId)}/${created.data.identifier}/labels`,
        cookieHeader,
        { labelId: labelData.data.id },
      )

      expect(res.status).toBe(201)

      // Verify via GET
      const getRes = await request(
        app,
        'GET',
        `${issuesPath(workspaceId, teamId)}/${created.data.identifier}`,
        cookieHeader,
      )
      const getIssue = await getRes.json()
      expect(getIssue.data.labels).toHaveLength(1)
      expect(getIssue.data.labels[0].name).toBe('Feature')
    })

    it('should return 409 for duplicate label attachment', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      const { data: created } = await createIssue(
        app,
        cookieHeader,
        workspaceId,
        teamId,
      )
      const { data: labelData } = await createLabel(
        app,
        cookieHeader,
        workspaceId,
      )

      // Attach once
      await request(
        app,
        'POST',
        `${issuesPath(workspaceId, teamId)}/${created.data.identifier}/labels`,
        cookieHeader,
        { labelId: labelData.data.id },
      )

      // Attach again
      const res = await request(
        app,
        'POST',
        `${issuesPath(workspaceId, teamId)}/${created.data.identifier}/labels`,
        cookieHeader,
        { labelId: labelData.data.id },
      )

      expect(res.status).toBe(409)
    })

    it('should detach a label from an issue', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      const { data: labelData } = await createLabel(
        app,
        cookieHeader,
        workspaceId,
        { name: 'Bug', color: '#ff0000' },
      )
      const { data: created } = await createIssue(
        app,
        cookieHeader,
        workspaceId,
        teamId,
        { title: 'Bug Issue', labelIds: [labelData.data.id] },
      )

      // Detach label
      const res = await request(
        app,
        'DELETE',
        `${issuesPath(workspaceId, teamId)}/${created.data.identifier}/labels/${labelData.data.id}`,
        cookieHeader,
      )

      expect(res.status).toBe(200)

      // Verify detached
      const getRes = await request(
        app,
        'GET',
        `${issuesPath(workspaceId, teamId)}/${created.data.identifier}`,
        cookieHeader,
      )
      const getIssue = await getRes.json()
      expect(getIssue.data.labels).toHaveLength(0)
    })
  })

  describe('Concurrent issue creation', () => {
    it('should not have number conflicts on concurrent creation', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      // Create 10 issues concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        createIssue(app, cookieHeader, workspaceId, teamId, {
          title: `Concurrent Issue ${i + 1}`,
        }),
      )

      const results = await Promise.all(promises)

      // All should succeed
      for (const result of results) {
        expect(result.res.status).toBe(201)
      }

      // All identifiers should be unique
      const identifiers = results.map((r) => r.data.data.identifier)
      const uniqueIdentifiers = new Set(identifiers)
      expect(uniqueIdentifiers.size).toBe(10)

      // All numbers should be unique and sequential (1-10)
      const numbers = results
        .map((r) => r.data.data.number)
        .sort((a: number, b: number) => a - b)
      expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    })
  })

  describe('CRUD full flow', () => {
    it('should support complete CRUD lifecycle', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId } = await setupWorkspaceAndTeam(
        app,
        cookieHeader,
      )

      // Create
      const { data: created } = await createIssue(
        app,
        cookieHeader,
        workspaceId,
        teamId,
        { title: 'Lifecycle Issue', description: 'Testing CRUD' },
      )
      expect(created.data.identifier).toBe('ENG-1')

      // Read
      const getRes = await request(
        app,
        'GET',
        `${issuesPath(workspaceId, teamId)}/ENG-1`,
        cookieHeader,
      )
      const getData = await getRes.json()
      expect(getData.data.title).toBe('Lifecycle Issue')
      expect(getData.data.description).toBe('Testing CRUD')

      // Update
      const updateRes = await request(
        app,
        'PATCH',
        `${issuesPath(workspaceId, teamId)}/ENG-1`,
        cookieHeader,
        { title: 'Updated Lifecycle Issue', priority: 2 },
      )
      const updateData = await updateRes.json()
      expect(updateData.data.title).toBe('Updated Lifecycle Issue')
      expect(updateData.data.priority).toBe(2)

      // List
      const listRes = await request(
        app,
        'GET',
        issuesPath(workspaceId, teamId),
        cookieHeader,
      )
      const listData = await listRes.json()
      expect(listData.data).toHaveLength(1)

      // Delete
      const delRes = await request(
        app,
        'DELETE',
        `${issuesPath(workspaceId, teamId)}/ENG-1`,
        cookieHeader,
      )
      expect(delRes.status).toBe(200)

      // Verify deleted
      const afterRes = await request(
        app,
        'GET',
        issuesPath(workspaceId, teamId),
        cookieHeader,
      )
      const afterData = await afterRes.json()
      expect(afterData.data).toHaveLength(0)
    })
  })
})
