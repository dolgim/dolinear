import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from '../../auth.ts'
import { authMiddleware } from '../../middleware/auth.ts'
import { workspacesRoute } from '../../routes/workspaces.ts'
import { createTestDb, cleanupDatabase } from '../helpers.ts'
import { createAuthenticatedUser } from '../auth-helpers.ts'
import type { Env } from '../../types.ts'

describe('Label Routes', () => {
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

  async function createLabel(
    app: Hono<Env>,
    cookieHeader: string,
    workspaceId: string,
    label: { name: string; color: string; description?: string | null },
  ) {
    const res = await request(
      app,
      'POST',
      `/api/workspaces/${workspaceId}/labels`,
      cookieHeader,
      label,
    )
    const data = await res.json()
    return { res, data }
  }

  describe('CRUD full flow', () => {
    it('should create, read, update, and delete a label', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: wsData } = await createWorkspace(app, cookieHeader)
      const workspaceId = wsData.data.id

      // Create
      const { res: createRes, data: createData } = await createLabel(
        app,
        cookieHeader,
        workspaceId,
        { name: 'Bug', color: '#ff0000', description: 'Bug reports' },
      )
      expect(createRes.status).toBe(201)
      expect(createData.data.name).toBe('Bug')
      expect(createData.data.color).toBe('#ff0000')
      expect(createData.data.description).toBe('Bug reports')
      expect(createData.data.workspaceId).toBe(workspaceId)
      const labelId = createData.data.id

      // Read (list)
      const listRes = await request(
        app,
        'GET',
        `/api/workspaces/${workspaceId}/labels`,
        cookieHeader,
      )
      const listData = await listRes.json()
      expect(listRes.status).toBe(200)
      expect(listData.data).toHaveLength(1)
      expect(listData.data[0].name).toBe('Bug')

      // Read (single)
      const getRes = await request(
        app,
        'GET',
        `/api/workspaces/${workspaceId}/labels/${labelId}`,
        cookieHeader,
      )
      const getData = await getRes.json()
      expect(getRes.status).toBe(200)
      expect(getData.data.id).toBe(labelId)

      // Update
      const updateRes = await request(
        app,
        'PATCH',
        `/api/workspaces/${workspaceId}/labels/${labelId}`,
        cookieHeader,
        { name: 'Critical Bug', color: '#cc0000' },
      )
      const updateData = await updateRes.json()
      expect(updateRes.status).toBe(200)
      expect(updateData.data.name).toBe('Critical Bug')
      expect(updateData.data.color).toBe('#cc0000')

      // Delete
      const deleteRes = await request(
        app,
        'DELETE',
        `/api/workspaces/${workspaceId}/labels/${labelId}`,
        cookieHeader,
      )
      expect(deleteRes.status).toBe(200)

      // Verify deleted
      const afterDeleteRes = await request(
        app,
        'GET',
        `/api/workspaces/${workspaceId}/labels`,
        cookieHeader,
      )
      const afterDeleteData = await afterDeleteRes.json()
      expect(afterDeleteData.data).toHaveLength(0)
    })

    it('should create a label with null description', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: wsData } = await createWorkspace(app, cookieHeader)
      const workspaceId = wsData.data.id

      const { res, data } = await createLabel(app, cookieHeader, workspaceId, {
        name: 'Feature',
        color: '#00ff00',
      })
      expect(res.status).toBe(201)
      expect(data.data.description).toBeNull()
    })
  })

  describe('Duplicate name → 409', () => {
    it('should return 409 when creating label with duplicate name in same workspace', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: wsData } = await createWorkspace(app, cookieHeader)
      const workspaceId = wsData.data.id

      await createLabel(app, cookieHeader, workspaceId, {
        name: 'Bug',
        color: '#ff0000',
      })

      const { res } = await createLabel(app, cookieHeader, workspaceId, {
        name: 'Bug',
        color: '#cc0000',
      })
      expect(res.status).toBe(409)
    })

    it('should return 409 when updating label to a name that already exists', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: wsData } = await createWorkspace(app, cookieHeader)
      const workspaceId = wsData.data.id

      await createLabel(app, cookieHeader, workspaceId, {
        name: 'Bug',
        color: '#ff0000',
      })
      const { data: featureData } = await createLabel(
        app,
        cookieHeader,
        workspaceId,
        {
          name: 'Feature',
          color: '#00ff00',
        },
      )

      const res = await request(
        app,
        'PATCH',
        `/api/workspaces/${workspaceId}/labels/${featureData.data.id}`,
        cookieHeader,
        { name: 'Bug' },
      )
      expect(res.status).toBe(409)
    })

    it('should allow same name in different workspaces', async () => {
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

      const { res: res1 } = await createLabel(
        app,
        cookieHeader,
        ws1Data.data.id,
        { name: 'Bug', color: '#ff0000' },
      )
      const { res: res2 } = await createLabel(
        app,
        cookieHeader,
        ws2Data.data.id,
        { name: 'Bug', color: '#ff0000' },
      )

      expect(res1.status).toBe(201)
      expect(res2.status).toBe(201)
    })
  })

  describe('Non-member → 403', () => {
    it('should return 403 for non-member trying to list labels', async () => {
      const app = createApp()
      const owner = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const other = await createAuthenticatedUser(app, {
        email: 'other@test.com',
      })

      const { data: wsData } = await createWorkspace(app, owner.cookieHeader)
      const workspaceId = wsData.data.id

      const res = await request(
        app,
        'GET',
        `/api/workspaces/${workspaceId}/labels`,
        other.cookieHeader,
      )
      expect(res.status).toBe(403)
    })

    it('should return 403 for non-member trying to create a label', async () => {
      const app = createApp()
      const owner = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const other = await createAuthenticatedUser(app, {
        email: 'other@test.com',
      })

      const { data: wsData } = await createWorkspace(app, owner.cookieHeader)
      const workspaceId = wsData.data.id

      const res = await request(
        app,
        'POST',
        `/api/workspaces/${workspaceId}/labels`,
        other.cookieHeader,
        { name: 'Bug', color: '#ff0000' },
      )
      expect(res.status).toBe(403)
    })

    it('should return 403 for non-member trying to update a label', async () => {
      const app = createApp()
      const owner = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const other = await createAuthenticatedUser(app, {
        email: 'other@test.com',
      })

      const { data: wsData } = await createWorkspace(app, owner.cookieHeader)
      const workspaceId = wsData.data.id

      const { data: labelData } = await createLabel(
        app,
        owner.cookieHeader,
        workspaceId,
        { name: 'Bug', color: '#ff0000' },
      )

      const res = await request(
        app,
        'PATCH',
        `/api/workspaces/${workspaceId}/labels/${labelData.data.id}`,
        other.cookieHeader,
        { name: 'Hacked' },
      )
      expect(res.status).toBe(403)
    })

    it('should return 403 for non-member trying to delete a label', async () => {
      const app = createApp()
      const owner = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const other = await createAuthenticatedUser(app, {
        email: 'other@test.com',
      })

      const { data: wsData } = await createWorkspace(app, owner.cookieHeader)
      const workspaceId = wsData.data.id

      const { data: labelData } = await createLabel(
        app,
        owner.cookieHeader,
        workspaceId,
        { name: 'Bug', color: '#ff0000' },
      )

      const res = await request(
        app,
        'DELETE',
        `/api/workspaces/${workspaceId}/labels/${labelData.data.id}`,
        other.cookieHeader,
      )
      expect(res.status).toBe(403)
    })
  })

  describe('Edge cases', () => {
    it('should return 404 for non-existent label', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: wsData } = await createWorkspace(app, cookieHeader)
      const workspaceId = wsData.data.id

      const res = await request(
        app,
        'GET',
        `/api/workspaces/${workspaceId}/labels/non-existent-id`,
        cookieHeader,
      )
      expect(res.status).toBe(404)
    })

    it('should return 400 for missing required fields', async () => {
      const app = createApp()
      const { cookieHeader } = await createAuthenticatedUser(app, {
        email: 'owner@test.com',
      })
      const { data: wsData } = await createWorkspace(app, cookieHeader)
      const workspaceId = wsData.data.id

      const res = await request(
        app,
        'POST',
        `/api/workspaces/${workspaceId}/labels`,
        cookieHeader,
        {},
      )
      expect(res.status).toBe(400)
    })
  })
})
