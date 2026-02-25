export interface Team {
  id: string
  name: string
  identifier: string
  workspaceId: string
  issueCounter: number
  createdAt: Date
  updatedAt: Date
}

export interface TeamMember {
  id: string
  teamId: string
  userId: string
  createdAt: Date
  updatedAt: Date
}
