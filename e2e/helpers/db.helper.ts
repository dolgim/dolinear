import postgres from 'postgres'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env from apps/api (where DATABASE_URL is set)
config({ path: resolve(import.meta.dirname, '../../apps/api/.env') })

// Domain tables only — auth tables (user, session, account, verification)
// are preserved so the storageState from setup remains valid.
const DOMAIN_TABLES = [
  'comment',
  'issue_label',
  'issue',
  'workflow_state',
  'label',
  'team_member',
  'team',
  'workspace_member',
  'workspace',
] as const

// All tables including auth — used only by setup/teardown
const ALL_TABLES = [
  ...DOMAIN_TABLES,
  'verification',
  'account',
  'session',
  'user',
] as const

let sql: postgres.Sql | null = null

function getConnection(): postgres.Sql {
  if (!sql) {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not set. Run `pnpm db:setup` first.')
    }
    sql = postgres(databaseUrl, { onnotice: () => {} })
  }
  return sql
}

/** Truncate domain data only (preserves auth state) */
export async function cleanDatabase(): Promise<void> {
  const conn = getConnection()
  for (const table of DOMAIN_TABLES) {
    await conn.unsafe(`TRUNCATE TABLE "${table}" CASCADE`)
  }
}

/** Truncate ALL tables including auth — used by setup project */
export async function cleanAllTables(): Promise<void> {
  const conn = getConnection()
  for (const table of ALL_TABLES) {
    await conn.unsafe(`TRUNCATE TABLE "${table}" CASCADE`)
  }
}

export async function closeDatabase(): Promise<void> {
  if (sql) {
    await sql.end()
    sql = null
  }
}
