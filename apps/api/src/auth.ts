import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db/index.ts'
import * as schema from './db/schema/index.ts'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: (request) => {
    const origin = request?.headers.get('origin') ?? ''
    const trusted: string[] = ['http://localhost:5173']
    if (origin.endsWith('.localhost:1355')) trusted.push(origin)
    return trusted
  },
})
