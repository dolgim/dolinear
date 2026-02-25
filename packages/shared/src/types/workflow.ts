export type WorkflowStateType =
  | 'backlog'
  | 'unstarted'
  | 'started'
  | 'completed'
  | 'cancelled'

export interface WorkflowState {
  id: string
  name: string
  type: WorkflowStateType
  color: string
  position: number
  teamId: string
  createdAt: Date
  updatedAt: Date
}
