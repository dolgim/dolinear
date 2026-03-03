import { test, expect } from '../../fixtures/base.fixture.js'

// Signup tests don't use stored auth state
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Signup', () => {
  test('should sign up and redirect to dashboard', async ({ page }) => {
    await page.goto('/signup')

    await page.getByLabel('Name').fill('New User')
    await page.getByLabel('Email').fill('new-user@dolinear.local')
    await page.getByLabel('Password').fill('newUserPass123')
    await page.getByRole('button', { name: 'Sign up' }).click()

    await page.waitForURL('**/dashboard')
    await expect(
      page.getByRole('heading', { name: 'Workspaces' }),
    ).toBeVisible()
  })

  test('should show error for short password', async ({ page }) => {
    await page.goto('/signup')

    await page.getByLabel('Name').fill('Short Pass')
    await page.getByLabel('Email').fill('short@dolinear.local')
    await page.getByLabel('Password').fill('short')
    await page.getByRole('button', { name: 'Sign up' }).click()

    // Should stay on signup page and show error
    await expect(page).toHaveURL(/\/signup/)
  })

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/signup')

    await page.getByRole('link', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
