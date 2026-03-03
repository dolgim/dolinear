import { test, expect } from '../../fixtures/base.fixture.js'
import { TEST_USER } from '../../helpers/constants.js'

// Use empty storageState — this test manages its own auth session
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Logout', () => {
  test('should logout and redirect to login page', async ({ page }) => {
    // Sign up a fresh user for this test to avoid invalidating the shared session
    await page.goto('/signup')
    await page.getByLabel('Name').fill('Logout Test User')
    await page.getByLabel('Email').fill('logout-test@dolinear.local')
    await page.getByLabel('Password').fill(TEST_USER.password)
    await page.getByRole('button', { name: 'Sign up' }).click()
    await page.waitForURL('**/dashboard')

    // Create a workspace to access the sidebar with logout button
    await page.getByRole('button', { name: 'Create workspace' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Workspace name').fill('Logout Test')
    await dialog.getByRole('button', { name: 'Create' }).click()
    await page.waitForURL(/\/workspace\//)

    // Click logout in sidebar
    await page.getByRole('button', { name: 'Log out' }).click()

    await page.waitForURL('**/login')
    await expect(page).toHaveURL(/\/login/)
  })
})
