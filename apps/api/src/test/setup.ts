import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

let container: StartedPostgreSqlContainer

export async function setup() {
  container = await new PostgreSqlContainer('postgres:15')
    .withDatabase('dolinear_test')
    .withUsername('test')
    .withPassword('test')
    .start()

  const connectionString = container.getConnectionUri()
  process.env.DATABASE_URL = connectionString

  // Apply schema using drizzle-kit push (stays in sync with schema.ts)
  const apiDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../..',
  )
  execSync('pnpm exec drizzle-kit push --force', {
    cwd: apiDir,
    env: { ...process.env, DATABASE_URL: connectionString },
    stdio: 'pipe',
  })
}

export async function teardown() {
  await container?.stop()
}
