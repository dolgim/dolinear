import { test as teardown } from '@playwright/test'
import { closeDatabase } from '../helpers/db.helper.js'

teardown('close database connection', async () => {
  await closeDatabase()
})
