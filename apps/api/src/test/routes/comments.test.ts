import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from '../../auth.ts'
import { authMiddleware } from '../../middleware/auth.ts'
import { workspacesRoute } from '../../routes/workspaces.ts'
import { createTestDb, cleanupDatabase } from '../helpers.ts'
import { createAuthenticatedUser } from '../auth-helpers.ts'
import type { Env } from '../../types.ts'

describe('Comment Routes', () => {
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

  function commentsPath(workspaceId: string, teamId: string, issueId: string) {
    return `/api/workspaces/${workspaceId}/teams/${teamId}/issues/${issueId}/comments`
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

  async function setupWorkspaceAndTeam(app: Hono<Env>, cookieHeader: string) {
    const { data: ws } = await createWorkspace(app, cookieHeader)
    const { data: team } = await createTeam(app, cookieHeader, ws.data.id)
    return { workspaceId: ws.data.id, teamId: team.data.id }
  }

  async function setupWithIssue(app: Hono<Env>, cookieHeader: string) {
    const { workspaceId, teamId } = await setupWorkspaceAndTeam(
      app,
      cookieHeader,
    )
    const { data: issue } = await createIssue(
      app,
      cookieHeader,
      workspaceId,
      teamId,
    )
    return { workspaceId, teamId, issueId: issue.data.id }
  }

  describe('POST /comments — Create comment', () => {
    it('should create a comment on an issue', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId, issueId } = await setupWithIssue(
        app,
        cookieHeader,
      )

      const res = await request(
        app,
        'POST',
        commentsPath(workspaceId, teamId, issueId),
        cookieHeader,
        { body: 'This is a comment' },
      )

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.data.body).toBe('This is a comment')
      expect(data.data.issueId).toBe(issueId)
      expect(data.data.userId).toBeDefined()
    })

    it('should return 400 if body is empty', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId, issueId } = await setupWithIssue(
        app,
        cookieHeader,
      )

      const res = await request(
        app,
        'POST',
        commentsPath(workspaceId, teamId, issueId),
        cookieHeader,
        { body: '' },
      )

      expect(res.status).toBe(400)
    })

    it('should return 404 if issue does not exist', async () => {
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
        'POST',
        commentsPath(workspaceId, teamId, 'non-existent-issue-id'),
        cookieHeader,
        { body: 'comment' },
      )

      expect(res.status).toBe(404)
    })
  })

  describe('GET /comments — List comments', () => {
    it('should list comments for an issue ordered by createdAt', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId, issueId } = await setupWithIssue(
        app,
        cookieHeader,
      )

      // Create two comments
      await request(
        app,
        'POST',
        commentsPath(workspaceId, teamId, issueId),
        cookieHeader,
        { body: 'First comment' },
      )
      await request(
        app,
        'POST',
        commentsPath(workspaceId, teamId, issueId),
        cookieHeader,
        { body: 'Second comment' },
      )

      const res = await request(
        app,
        'GET',
        commentsPath(workspaceId, teamId, issueId),
        cookieHeader,
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.data).toHaveLength(2)
      expect(data.data[0].body).toBe('First comment')
      expect(data.data[1].body).toBe('Second comment')
    })

    it('should return empty array if no comments', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId, issueId } = await setupWithIssue(
        app,
        cookieHeader,
      )

      const res = await request(
        app,
        'GET',
        commentsPath(workspaceId, teamId, issueId),
        cookieHeader,
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.data).toHaveLength(0)
    })
  })

  describe('PATCH /comments/:commentId — Update comment', () => {
    it('should update a comment by the author', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId, issueId } = await setupWithIssue(
        app,
        cookieHeader,
      )

      // Create a comment
      const createRes = await request(
        app,
        'POST',
        commentsPath(workspaceId, teamId, issueId),
        cookieHeader,
        { body: 'Original body' },
      )
      const createData = await createRes.json()
      const commentId = createData.data.id

      // Update the comment
      const res = await request(
        app,
        'PATCH',
        `${commentsPath(workspaceId, teamId, issueId)}/${commentId}`,
        cookieHeader,
        { body: 'Updated body' },
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.data.body).toBe('Updated body')
    })

    it('should return 403 if non-author tries to update', async () => {
      const app = createApp()
      const { cookieHeader: ownerCookie } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId, issueId } = await setupWithIssue(
        app,
        ownerCookie,
      )

      // Create a comment as owner
      const createRes = await request(
        app,
        'POST',
        commentsPath(workspaceId, teamId, issueId),
        ownerCookie,
        { body: 'Owner comment' },
      )
      const createData = await createRes.json()
      const commentId = createData.data.id

      // Create another user and get their ID from sign-up response
      const otherSignUp = await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Member User',
          email: 'member@test.com',
          password: 'password123',
        }),
      })
      const otherData = await otherSignUp.json()
      const otherUserId = (otherData as { user: { id: string } }).user.id
      const otherCookies = otherSignUp.headers.getSetCookie()
      const memberCookie = otherCookies.map((c) => c.split(';')[0]).join('; ')

      // Add other user as workspace member
      await request(
        app,
        'POST',
        `/api/workspaces/${workspaceId}/members`,
        ownerCookie,
        { userId: otherUserId, role: 'member' },
      )

      // Try to update the comment as other user
      const res = await request(
        app,
        'PATCH',
        `${commentsPath(workspaceId, teamId, issueId)}/${commentId}`,
        memberCookie,
        { body: 'Hacked!' },
      )

      expect(res.status).toBe(403)
    })

    it('should return 404 if comment does not exist', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId, issueId } = await setupWithIssue(
        app,
        cookieHeader,
      )

      const res = await request(
        app,
        'PATCH',
        `${commentsPath(workspaceId, teamId, issueId)}/non-existent`,
        cookieHeader,
        { body: 'Updated' },
      )

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /comments/:commentId — Delete comment', () => {
    it('should delete a comment by the author', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId, issueId } = await setupWithIssue(
        app,
        cookieHeader,
      )

      // Create a comment
      const createRes = await request(
        app,
        'POST',
        commentsPath(workspaceId, teamId, issueId),
        cookieHeader,
        { body: 'To be deleted' },
      )
      const createData = await createRes.json()
      const commentId = createData.data.id

      // Delete the comment
      const res = await request(
        app,
        'DELETE',
        `${commentsPath(workspaceId, teamId, issueId)}/${commentId}`,
        cookieHeader,
      )

      expect(res.status).toBe(200)

      // Verify it's gone
      const listRes = await request(
        app,
        'GET',
        commentsPath(workspaceId, teamId, issueId),
        cookieHeader,
      )
      const listData = await listRes.json()
      expect(listData.data).toHaveLength(0)
    })

    it('should return 403 if non-author tries to delete', async () => {
      const app = createApp()
      const { cookieHeader: ownerCookie } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId, issueId } = await setupWithIssue(
        app,
        ownerCookie,
      )

      // Create a comment as owner
      const createRes = await request(
        app,
        'POST',
        commentsPath(workspaceId, teamId, issueId),
        ownerCookie,
        { body: 'Owner comment' },
      )
      const createData = await createRes.json()
      const commentId = createData.data.id

      // Create another user and add as workspace member
      const otherSignUp = await app.request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Member User',
          email: 'member@test.com',
          password: 'password123',
        }),
      })
      const otherData = await otherSignUp.json()
      const otherUserId = (otherData as { user: { id: string } }).user.id
      const otherCookies = otherSignUp.headers.getSetCookie()
      const memberCookie = otherCookies.map((c) => c.split(';')[0]).join('; ')

      // Add as workspace member
      await request(
        app,
        'POST',
        `/api/workspaces/${workspaceId}/members`,
        ownerCookie,
        { userId: otherUserId, role: 'member' },
      )

      // Try to delete the comment as other user
      const res = await request(
        app,
        'DELETE',
        `${commentsPath(workspaceId, teamId, issueId)}/${commentId}`,
        memberCookie,
      )

      expect(res.status).toBe(403)
    })
  })

  describe('CASCADE delete — Issue deletion removes comments', () => {
    it('should delete comments when issue is deleted', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { workspaceId, teamId, issueId } = await setupWithIssue(
        app,
        cookieHeader,
      )

      // Create comments
      await request(
        app,
        'POST',
        commentsPath(workspaceId, teamId, issueId),
        cookieHeader,
        { body: 'Comment 1' },
      )
      await request(
        app,
        'POST',
        commentsPath(workspaceId, teamId, issueId),
        cookieHeader,
        { body: 'Comment 2' },
      )

      // Verify comments exist
      const listRes = await request(
        app,
        'GET',
        commentsPath(workspaceId, teamId, issueId),
        cookieHeader,
      )
      const listData = await listRes.json()
      expect(listData.data).toHaveLength(2)

      // Get issue identifier for deletion
      const issueListRes = await request(
        app,
        'GET',
        issuesPath(workspaceId, teamId),
        cookieHeader,
      )
      const issueListData = await issueListRes.json()
      const issueIdentifier = issueListData.data[0].identifier

      // Delete the issue
      const deleteRes = await request(
        app,
        'DELETE',
        `${issuesPath(workspaceId, teamId)}/${issueIdentifier}`,
        cookieHeader,
      )
      expect(deleteRes.status).toBe(200)

      // Verify comments are also deleted (by trying to access them via a new issue)
      // Since the issue is deleted, we can't list comments for it (404)
      const commentsAfterRes = await request(
        app,
        'GET',
        commentsPath(workspaceId, teamId, issueId),
        cookieHeader,
      )
      expect(commentsAfterRes.status).toBe(404)
    })
  })
})
