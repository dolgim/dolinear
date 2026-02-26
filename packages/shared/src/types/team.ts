export interface Team {
  id: string
  name: string
  identifier: string
  issueCounter: number
  workspaceId: string
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
