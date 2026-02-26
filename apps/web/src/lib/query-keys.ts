export const queryKeys = {
  workspaces: {
    all: ['workspaces'] as const,
    detail: (id: string) => ['workspaces', id] as const,
    list: (filters?: Record<string, unknown>) =>
      ['workspaces', 'list', filters] as const,
  },
  teams: {
    all: ['teams'] as const,
    detail: (id: string) => ['teams', id] as const,
    list: (workspaceId: string) => ['teams', 'list', workspaceId] as const,
  },
  issues: {
    all: ['issues'] as const,
    detail: (id: string) => ['issues', id] as const,
    detailByIdentifier: (identifier: string) =>
      ['issues', 'identifier', identifier] as const,
    list: (filters?: Record<string, unknown>) =>
      ['issues', 'list', filters] as const,
  },
  labels: {
    all: ['labels'] as const,
    list: (workspaceId: string) => ['labels', 'list', workspaceId] as const,
  },
  comments: {
    all: ['comments'] as const,
    list: (issueId: string) => ['comments', 'list', issueId] as const,
  },
  workflowStates: {
    all: ['workflowStates'] as const,
    list: (teamId: string) => ['workflowStates', 'list', teamId] as const,
  },
  teamMembers: {
    all: ['teamMembers'] as const,
    list: (teamId: string) => ['teamMembers', 'list', teamId] as const,
  },
}
