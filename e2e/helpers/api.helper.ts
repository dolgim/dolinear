import type { APIRequestContext } from '@playwright/test'

export class ApiHelper {
  constructor(private request: APIRequestContext) {}

  private async unwrap(res: Awaited<ReturnType<APIRequestContext['get']>>) {
    const json = await res.json()
    return json.data ?? json
  }

  async createWorkspace(name: string) {
    const res = await this.request.post('/api/workspaces', {
      data: { name },
    })
    if (!res.ok()) {
      throw new Error(
        `Failed to create workspace: ${res.status()} ${await res.text()}`,
      )
    }
    return this.unwrap(res)
  }

  async getWorkspaces() {
    const res = await this.request.get('/api/workspaces')
    if (!res.ok()) {
      throw new Error(`Failed to get workspaces: ${res.status()}`)
    }
    return this.unwrap(res)
  }

  async createTeam(workspaceId: string, name: string, identifier: string) {
    const res = await this.request.post(
      `/api/workspaces/${workspaceId}/teams`,
      { data: { name, identifier } },
    )
    if (!res.ok()) {
      throw new Error(
        `Failed to create team: ${res.status()} ${await res.text()}`,
      )
    }
    return this.unwrap(res)
  }

  async getTeams(workspaceId: string) {
    const res = await this.request.get(`/api/workspaces/${workspaceId}/teams`)
    if (!res.ok()) {
      throw new Error(`Failed to get teams: ${res.status()}`)
    }
    return this.unwrap(res)
  }

  async getWorkflowStates(workspaceId: string, teamId: string) {
    const res = await this.request.get(
      `/api/workspaces/${workspaceId}/teams/${teamId}/states`,
    )
    if (!res.ok()) {
      throw new Error(`Failed to get workflow states: ${res.status()}`)
    }
    return this.unwrap(res)
  }

  async createIssue(
    workspaceId: string,
    teamId: string,
    data: { title: string; description?: string; priority?: number },
  ) {
    const res = await this.request.post(
      `/api/workspaces/${workspaceId}/teams/${teamId}/issues`,
      { data },
    )
    if (!res.ok()) {
      throw new Error(
        `Failed to create issue: ${res.status()} ${await res.text()}`,
      )
    }
    return this.unwrap(res)
  }

  async getIssues(workspaceId: string, teamId: string) {
    const res = await this.request.get(
      `/api/workspaces/${workspaceId}/teams/${teamId}/issues`,
    )
    if (!res.ok()) {
      throw new Error(`Failed to get issues: ${res.status()}`)
    }
    return this.unwrap(res)
  }

  async createComment(
    workspaceId: string,
    teamId: string,
    issueId: string,
    body: string,
  ) {
    const res = await this.request.post(
      `/api/workspaces/${workspaceId}/teams/${teamId}/issues/${issueId}/comments`,
      { data: { body } },
    )
    if (!res.ok()) {
      throw new Error(
        `Failed to create comment: ${res.status()} ${await res.text()}`,
      )
    }
    return this.unwrap(res)
  }
}
