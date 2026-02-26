import {
  pgTable,
  text,
  timestamp,
  integer,
  unique,
  index,
  real,
  primaryKey,
} from 'drizzle-orm/pg-core'
import { team } from './team.ts'
import { workflowState } from './workflow-state.ts'
import { user } from './auth.ts'
import { label } from './label.ts'

export const issue = pgTable(
  'issue',
  {
    id: text('id').primaryKey(),
    teamId: text('team_id')
      .notNull()
      .references(() => team.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    identifier: text('identifier').notNull().unique(),
    title: text('title').notNull(),
    description: text('description'),
    workflowStateId: text('workflow_state_id')
      .notNull()
      .references(() => workflowState.id),
    priority: integer('priority').notNull().default(0),
    assigneeId: text('assignee_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    creatorId: text('creator_id')
      .notNull()
      .references(() => user.id),
    dueDate: timestamp('due_date', { withTimezone: true }),
    estimate: integer('estimate'),
    sortOrder: real('sort_order').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('issue_team_state_idx').on(table.teamId, table.workflowStateId),
    index('issue_assignee_idx').on(table.assigneeId),
    unique('issue_team_number_uniq').on(table.teamId, table.number),
  ],
)

export const issueLabel = pgTable(
  'issue_label',
  {
    issueId: text('issue_id')
      .notNull()
      .references(() => issue.id, { onDelete: 'cascade' }),
    labelId: text('label_id')
      .notNull()
      .references(() => label.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.issueId, table.labelId] })],
)
