import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle',
  schema: [
    './src/db/schema/auth.ts',
    './src/db/schema/workspace.ts',
    './src/db/schema/label.ts',
    './src/db/schema/team.ts',
    './src/db/schema/workflow-state.ts',
  ],
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
