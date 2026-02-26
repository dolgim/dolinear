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
    title: 'Test Issue',
    description: null,
    status: 'todo',
    priority: 'none',
    number: 1,
    teamId: randomUUID(),
    assigneeId: null,
    creatorId: randomUUID(),
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}
