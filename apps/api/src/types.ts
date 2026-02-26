import type { auth } from './auth.ts'

type Session = typeof auth.$Infer.Session

export type Env = {
  Variables: {
    user: Session['user']
    session: Session['session']
  }
}

export type WorkspaceEnv = {
  Variables: Env['Variables'] & {
    workspace: { id: string; name: string; slug: string; ownerId: string }
    workspaceMember: { id: string; role: string }
  }
}
