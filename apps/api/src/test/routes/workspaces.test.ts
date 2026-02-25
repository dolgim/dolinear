import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from '../../auth.js'
import { authMiddleware } from '../../middleware/auth.js'
import { workspacesRoute } from '../../routes/workspaces.js'
import { createTestDb, cleanupDatabase } from '../helpers.js'
import { createAuthenticatedUser } from '../auth-helpers.js'
import type { Env } from '../../types.js'

describe('Workspace Routes', () => {
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

  describe('POST /api/workspaces', () => {
    it('should create a workspace', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { res, data } = await createWorkspace(
        app,
        cookieHeader,
        'My Workspace',
      )

      expect(res.status).toBe(201)
      expect(data.data.name).toBe('My Workspace')
      expect(data.data.slug).toBe('my-workspace')
      expect(data.data.id).toBeDefined()
    })

    it('should auto-generate unique slugs', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })

      const { data: first } = await createWorkspace(
        app,
        cookieHeader,
        'My Workspace',
      )
      expect(first.data.slug).toBe('my-workspace')

      const { data: second } = await createWorkspace(
        app,
        cookieHeader,
        'My Workspace',
      )
      expect(second.data.slug).toBe('my-workspace-2')
    })

    it('should add creator as owner member', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data } = await createWorkspace(app, cookieHeader)

      const membersRes = await request(
        app,
        'GET',
        `/api/workspaces/${data.data.id}/members`,
        cookieHeader,
      )
      const members = await membersRes.json()

      expect(members.data).toHaveLength(1)
      expect(members.data[0].role).toBe('owner')
    })

    it('should return 400 for missing name', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const res = await request(
        app,
        'POST',
        '/api/workspaces',
        cookieHeader,
        {},
      )

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/workspaces', () => {
    it('should list only my workspaces', async () => {
      const app = createApp()
      const user1 = await createAuthenticatedUser(app, {
        email: 'user1@test.com',
      })
      const user2 = await createAuthenticatedUser(app, {
        email: 'user2@test.com',
      })

      await createWorkspace(app, user1.cookieHeader, 'Workspace 1')
      await createWorkspace(app, user2.cookieHeader, 'Workspace 2')

      const res = await request(
        app,
        'GET',
        '/api/workspaces',
        user1.cookieHeader,
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].name).toBe('Workspace 1')
    })
  })

  describe('GET /api/workspaces/:workspaceId', () => {
    it('should return workspace detail for member', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data } = await createWorkspace(app, cookieHeader)

      const res = await request(
        app,
        'GET',
        `/api/workspaces/${data.data.id}`,
        cookieHeader,
      )
      const detail = await res.json()

      expect(res.status).toBe(200)
      expect(detail.data.id).toBe(data.data.id)
    })

    it('should return 403 for non-member', async () => {
      const app = createApp()
      const owner = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const other = await createAuthenticatedUser(app, {
        email: 'other@test.com',
      })

      const { data } = await createWorkspace(app, owner.cookieHeader)

      const res = await request(
        app,
        'GET',
        `/api/workspaces/${data.data.id}`,
        other.cookieHeader,
      )

      expect(res.status).toBe(403)
    })
  })

  describe('PATCH /api/workspaces/:workspaceId', () => {
    it('should update workspace name for owner', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data } = await createWorkspace(app, cookieHeader)

      const res = await request(
        app,
        'PATCH',
        `/api/workspaces/${data.data.id}`,
        cookieHeader,
        { name: 'Updated Name' },
      )
      const updated = await res.json()

      expect(res.status).toBe(200)
      expect(updated.data.name).toBe('Updated Name')
    })

    it('should return 403 for member without admin/owner role', async () => {
      const app = createApp()
      const owner = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const member = await createAuthenticatedUser(app, {
        email: 'member@test.com',
      })

      const { data } = await createWorkspace(app, owner.cookieHeader)

      // Get member's user id
      const memberSessionRes = await app.request('/api/auth/get-session', {
        headers: { Cookie: member.cookieHeader },
      })
      const memberSession = await memberSessionRes.json()

      // Add member with 'member' role
      await request(
        app,
        'POST',
        `/api/workspaces/${data.data.id}/members`,
        owner.cookieHeader,
        { userId: memberSession.user.id, role: 'member' },
      )

      const res = await request(
        app,
        'PATCH',
        `/api/workspaces/${data.data.id}`,
        member.cookieHeader,
        { name: 'Hacked' },
      )

      expect(res.status).toBe(403)
    })
  })

  describe('DELETE /api/workspaces/:workspaceId', () => {
    it('should delete workspace for owner', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data } = await createWorkspace(app, cookieHeader)

      const res = await request(
        app,
        'DELETE',
        `/api/workspaces/${data.data.id}`,
        cookieHeader,
      )

      expect(res.status).toBe(200)

      const listRes = await request(app, 'GET', '/api/workspaces', cookieHeader)
      const listData = await listRes.json()
      expect(listData.data).toHaveLength(0)
    })

    it('should return 403 for non-owner', async () => {
      const app = createApp()
      const owner = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const admin = await createAuthenticatedUser(app, {
        email: 'admin@test.com',
      })

      const { data } = await createWorkspace(app, owner.cookieHeader)

      const adminSessionRes = await app.request('/api/auth/get-session', {
        headers: { Cookie: admin.cookieHeader },
      })
      const adminSession = await adminSessionRes.json()

      await request(
        app,
        'POST',
        `/api/workspaces/${data.data.id}/members`,
        owner.cookieHeader,
        { userId: adminSession.user.id, role: 'admin' },
      )

      const res = await request(
        app,
        'DELETE',
        `/api/workspaces/${data.data.id}`,
        admin.cookieHeader,
      )

      expect(res.status).toBe(403)
    })
  })

  describe('POST /api/workspaces/:workspaceId/members', () => {
    it('should add member as owner', async () => {
      const app = createApp()
      const owner = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const newUser = await createAuthenticatedUser(app, {
        email: 'new@test.com',
      })

      const { data } = await createWorkspace(app, owner.cookieHeader)

      const sessionRes = await app.request('/api/auth/get-session', {
        headers: { Cookie: newUser.cookieHeader },
      })
      const session = await sessionRes.json()

      const res = await request(
        app,
        'POST',
        `/api/workspaces/${data.data.id}/members`,
        owner.cookieHeader,
        { userId: session.user.id, role: 'member' },
      )

      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.data.role).toBe('member')
    })

    it('should return 403 for member trying to add', async () => {
      const app = createApp()
      const owner = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const member = await createAuthenticatedUser(app, {
        email: 'member@test.com',
      })
      const another = await createAuthenticatedUser(app, {
        email: 'another@test.com',
      })

      const { data } = await createWorkspace(app, owner.cookieHeader)

      const memberSessionRes = await app.request('/api/auth/get-session', {
        headers: { Cookie: member.cookieHeader },
      })
      const memberSession = await memberSessionRes.json()

      const anotherSessionRes = await app.request('/api/auth/get-session', {
        headers: { Cookie: another.cookieHeader },
      })
      const anotherSession = await anotherSessionRes.json()

      await request(
        app,
        'POST',
        `/api/workspaces/${data.data.id}/members`,
        owner.cookieHeader,
        { userId: memberSession.user.id, role: 'member' },
      )

      const res = await request(
        app,
        'POST',
        `/api/workspaces/${data.data.id}/members`,
        member.cookieHeader,
        { userId: anotherSession.user.id, role: 'member' },
      )

      expect(res.status).toBe(403)
    })

    it('should not allow setting owner role', async () => {
      const app = createApp()
      const owner = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const newUser = await createAuthenticatedUser(app, {
        email: 'new@test.com',
      })

      const { data } = await createWorkspace(app, owner.cookieHeader)

      const sessionRes = await app.request('/api/auth/get-session', {
        headers: { Cookie: newUser.cookieHeader },
      })
      const session = await sessionRes.json()

      const res = await request(
        app,
        'POST',
        `/api/workspaces/${data.data.id}/members`,
        owner.cookieHeader,
        { userId: session.user.id, role: 'owner' },
      )

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/workspaces/:workspaceId/members', () => {
    it('should list members with user info', async () => {
      const app = createApp()
      const owner = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
        name: 'Owner',
      })
      const { data } = await createWorkspace(app, owner.cookieHeader)

      const res = await request(
        app,
        'GET',
        `/api/workspaces/${data.data.id}/members`,
        owner.cookieHeader,
      )
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data).toHaveLength(1)
      expect(body.data[0].user).toBeDefined()
      expect(body.data[0].user.email).toBe('owner@test.com')
      expect(body.data[0].user.name).toBe('Owner')
    })
  })
})
