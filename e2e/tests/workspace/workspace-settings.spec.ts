import { test, expect } from '../../fixtures/base.fixture.js'

test.describe('Workspace Settings', () => {
  let workspaceSlug: string

  test.beforeEach(async ({ api }) => {
    const ws = await api.createWorkspace('Settings Test Workspace')
    workspaceSlug = ws.slug ?? 'settings-test-workspace'
  })

  test.describe('Settings Layout', () => {
    test('should show settings layout with tabs', async ({ page }) => {
      await page.goto(`/workspace/${workspaceSlug}/settings/general`)

      await expect(page.getByTestId('settings-layout')).toBeVisible()
      await expect(page.getByTestId('settings-tab-general')).toBeVisible()
      await expect(page.getByTestId('settings-tab-members')).toBeVisible()
      await expect(page.getByTestId('settings-tab-labels')).toBeVisible()
      await expect(page.getByTestId('settings-tab-teams')).toBeVisible()
    })

    test('should navigate between settings tabs', async ({ page }) => {
      await page.goto(`/workspace/${workspaceSlug}/settings/general`)
      await expect(page.getByTestId('general-settings-page')).toBeVisible()

      await page.getByTestId('settings-tab-members').click()
      await page.waitForURL(`/workspace/${workspaceSlug}/settings/members`)
      await expect(page.getByTestId('members-settings-page')).toBeVisible()

      await page.getByTestId('settings-tab-teams').click()
      await page.waitForURL(`/workspace/${workspaceSlug}/settings/teams`)
      await expect(page.getByTestId('teams-settings-page')).toBeVisible()
    })

    test('should redirect /settings to /settings/general', async ({ page }) => {
      await page.goto(`/workspace/${workspaceSlug}/settings`)
      await page.waitForURL(`/workspace/${workspaceSlug}/settings/general`)
      await expect(page.getByTestId('general-settings-page')).toBeVisible()
    })
  })

  test.describe('General Tab', () => {
    test('should display workspace name and slug', async ({ page }) => {
      await page.goto(`/workspace/${workspaceSlug}/settings/general`)

      const nameInput = page.getByTestId('workspace-name-input')
      await expect(nameInput).toBeVisible()
      await expect(nameInput).toHaveValue('Settings Test Workspace')

      const slugInput = page.getByTestId('workspace-slug-input')
      await expect(slugInput).toBeVisible()
      await expect(slugInput).toBeDisabled()
    })

    test('should update workspace name', async ({ page }) => {
      await page.goto(`/workspace/${workspaceSlug}/settings/general`)

      const nameInput = page.getByTestId('workspace-name-input')
      await nameInput.clear()
      await nameInput.fill('Updated Workspace Name')

      const saveButton = page.getByTestId('save-workspace-name')
      await expect(saveButton).toBeEnabled()
      await saveButton.click()

      // Verify the name was updated (save button should be disabled again)
      await expect(saveButton).toBeDisabled()
    })

    test('should disable save button when name unchanged', async ({ page }) => {
      await page.goto(`/workspace/${workspaceSlug}/settings/general`)

      const saveButton = page.getByTestId('save-workspace-name')
      await expect(saveButton).toBeDisabled()
    })
  })

  test.describe('Members Tab', () => {
    test('should display members table with current user', async ({ page }) => {
      await page.goto(`/workspace/${workspaceSlug}/settings/members`)

      await expect(page.getByTestId('members-settings-page')).toBeVisible()
      await expect(page.getByTestId('members-table')).toBeVisible()

      // Current user should be listed as owner
      const memberRows = page.locator('[data-testid^="member-row-"]')
      await expect(memberRows).toHaveCount(1)
    })

    test('should show add member dialog', async ({ page }) => {
      await page.goto(`/workspace/${workspaceSlug}/settings/members`)

      await page.getByTestId('add-member-button').click()

      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await expect(dialog.getByTestId('add-member-user-id')).toBeVisible()
      await expect(dialog.getByTestId('add-member-role-select')).toBeVisible()
      await expect(dialog.getByTestId('add-member-submit')).toBeVisible()
    })
  })

  test.describe('Sidebar Navigation', () => {
    test('should navigate to settings from sidebar', async ({ page }) => {
      await page.goto(`/workspace/${workspaceSlug}/my-issues`)

      await page.getByTestId('sidebar-settings').click()
      await page.waitForURL(`/workspace/${workspaceSlug}/settings/general`)
      await expect(page.getByTestId('settings-layout')).toBeVisible()
    })
  })
})
