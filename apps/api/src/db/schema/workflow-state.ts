import { pgTable, text, timestamp, integer, unique } from 'drizzle-orm/pg-core'
import { team } from './team.ts'

export const workflowState = pgTable(
  'workflow_state',
  {
    id: text('id').primaryKey(),
    teamId: text('team_id')
      .notNull()
      .references(() => team.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull(),
    type: text('type', {
      enum: ['backlog', 'unstarted', 'started', 'completed', 'cancelled'],
    }).notNull(),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.teamId, table.name)],
)
