import type { auth } from './auth.js'

type Session = typeof auth.$Infer.Session

export type Env = {
  Variables: {
    user: Session['user']
    session: Session['session']
  }
}
