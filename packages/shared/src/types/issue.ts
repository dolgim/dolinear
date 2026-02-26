export type IssuePriority = 0 | 1 | 2 | 3 | 4

export const PRIORITY_LABELS: Record<IssuePriority, string> = {
  0: 'none',
  1: 'urgent',
  2: 'high',
  3: 'medium',
  4: 'low',
}

export interface Issue {
  id: string
  teamId: string
  number: number
  identifier: string
  title: string
  description: string | null
  workflowStateId: string
  priority: IssuePriority
  assigneeId: string | null
  creatorId: string
  dueDate: string | null
  estimate: number | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface IssueLabel {
  issueId: string
  labelId: string
}
