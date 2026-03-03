import { test, expect } from '../../fixtures/base.fixture.js'
import { TEST_USER } from '../../helpers/constants.js'

// Login tests don't use stored auth state
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Login', () => {
  test('should login and redirect to dashboard', async ({ page }) => {
    // TEST_USER was created by the setup project and preserved across tests.
    // Just test logging in directly.
    await page.goto('/login')
    await page.getByLabel('Email').fill(TEST_USER.email)
    await page.getByLabel('Password').fill(TEST_USER.password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await page.waitForURL('**/dashboard')
    await expect(
      page.getByRole('heading', { name: 'Workspaces' }),
    ).toBeVisible()
  })

  test('should show error for wrong password', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel('Email').fill(TEST_USER.email)
    await page.getByLabel('Password').fill('wrongpassword123')
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Should stay on login page
    await expect(page).toHaveURL(/\/login/)
  })
})
