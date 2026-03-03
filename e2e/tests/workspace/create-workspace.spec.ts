import { test, expect } from '../../fixtures/base.fixture.js'

test.describe('Create Workspace', () => {
  test('should create workspace via dialog', async ({ page }) => {
    await page.goto('/dashboard')

    await page.getByRole('button', { name: 'Create workspace' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByLabel('Workspace name').fill('My Test Workspace')

    // Slug preview should appear
    await expect(dialog.getByText('Slug:')).toBeVisible()

    await dialog.getByRole('button', { name: 'Create' }).click()

    // Should redirect to the new workspace
    await page.waitForURL(/\/workspace\/my-test-workspace/)
  })

  test('should show workspace created via API on dashboard', async ({
    page,
    api,
  }) => {
    await api.createWorkspace('API Created Workspace')

    await page.goto('/dashboard')
    await expect(page.getByText('API Created Workspace')).toBeVisible()
  })
})
