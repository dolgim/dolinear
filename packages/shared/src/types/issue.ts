export type IssuePriority = 'none' | 'urgent' | 'high' | 'medium' | 'low'

export interface Issue {
  id: string
  title: string
  description: string | null
  status: string
  priority: IssuePriority
  number: number
  teamId: string
  assigneeId: string | null
  creatorId: string
  parentId: string | null
  createdAt: Date
  updatedAt: Date
}
