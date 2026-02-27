import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core'
import { issue } from './issue.ts'
import { user } from './auth.ts'

export const comment = pgTable(
  'comment',
  {
    id: text('id').primaryKey(),
    issueId: text('issue_id')
      .notNull()
      .references(() => issue.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('comment_issue_created_idx').on(table.issueId, table.createdAt),
  ],
)
