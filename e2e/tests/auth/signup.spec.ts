import { test, expect } from '../../fixtures/base.fixture.js'
import { TEST_USER } from '../../helpers/constants.js'

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

  test('should prevent submission for short password via browser validation', async ({
    page,
  }) => {
    await page.goto('/signup')

    await page.getByLabel('Name').fill('Short Pass')
    await page.getByLabel('Email').fill('short@dolinear.local')
    await page.getByLabel('Password').fill('short')
    await page.getByRole('button', { name: 'Sign up' }).click()

    // Browser native validation prevents form submission (minLength=8)
    // so the page stays on signup without navigating
    await expect(page).toHaveURL(/\/signup/)
  })

  test('should show error for duplicate email', async ({ page }) => {
    await page.goto('/signup')

    // TEST_USER is already registered by the setup project
    await page.getByLabel('Name').fill('Duplicate User')
    await page.getByLabel('Email').fill(TEST_USER.email)
    await page.getByLabel('Password').fill('somepassword123')
    await page.getByRole('button', { name: 'Sign up' }).click()

    const errorAlert = page.getByTestId('auth-error')
    await expect(errorAlert).toBeVisible()
    await expect(errorAlert).toContainText('already registered')
  })

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/signup')

    await page.getByRole('link', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
