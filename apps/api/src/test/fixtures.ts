import { randomUUID } from 'node:crypto'
import type {
  User,
  Workspace,
  WorkspaceMember,
  Team,
  Issue,
} from '@dolinear/shared'

export function buildUser(overrides?: Partial<User>): User {
  return {
    id: randomUUID(),
    name: 'Test User',
    email: `user-${randomUUID().slice(0, 8)}@example.com`,
    emailVerified: false,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildWorkspace(overrides?: Partial<Workspace>): Workspace {
  return {
    id: randomUUID(),
    name: 'Test Workspace',
    slug: `workspace-${randomUUID().slice(0, 8)}`,
    ownerId: randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildWorkspaceMember(
  overrides?: Partial<WorkspaceMember>,
): WorkspaceMember {
  return {
    id: randomUUID(),
    workspaceId: randomUUID(),
    userId: randomUUID(),
    role: 'member',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildTeam(overrides?: Partial<Team>): Team {
  return {
    id: randomUUID(),
    name: 'Test Team',
    identifier: 'TST',
    issueCounter: 0,
    workspaceId: randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function buildIssue(overrides?: Partial<Issue>): Issue {
  return {
    id: randomUUID(),
    teamId: randomUUID(),
    number: 1,
    identifier: 'TST-1',
    title: 'Test Issue',
    description: null,
    workflowStateId: randomUUID(),
    priority: 0,
    assigneeId: null,
    creatorId: randomUUID(),
    dueDate: null,
    estimate: null,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}
