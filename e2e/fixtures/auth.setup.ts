import { test as setup } from '@playwright/test'
import { TEST_USER } from '../helpers/constants.js'
import { cleanAllTables } from '../helpers/db.helper.js'

setup('create authenticated user', async ({ page }) => {
  // Clean all tables (including auth) to start fresh
  await cleanAllTables()

  // Sign up via the UI
  await page.goto('/signup')
  await page.getByLabel('Name').fill(TEST_USER.name)
  await page.getByLabel('Email').fill(TEST_USER.email)
  await page.getByLabel('Password').fill(TEST_USER.password)
  await page.getByRole('button', { name: 'Sign up' }).click()

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard')

  // Save signed-in state
  await page.context().storageState({ path: '.auth/user.json' })
})
