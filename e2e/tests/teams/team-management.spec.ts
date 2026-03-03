import { test, expect } from '../../fixtures/base.fixture.js'

test.describe('Team Management', () => {
  let workspaceSlug: string

  test.beforeEach(async ({ api }) => {
    const ws = await api.createWorkspace('Team Test Workspace')
    workspaceSlug = ws.slug ?? 'team-test-workspace'
  })

  test('should create a team via sidebar button', async ({ page }) => {
    await page.goto(`/workspace/${workspaceSlug}/my-issues`)
    await expect(page.getByTestId('sidebar')).toBeVisible()

    await page.getByTestId('sidebar-create-team').click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByTestId('team-name-input').fill('Engineering')
    await dialog.getByTestId('team-identifier-input').fill('ENG')

    // Should show issue prefix preview
    await expect(dialog.getByText('ENG-1')).toBeVisible()

    await dialog.getByTestId('create-team-submit').click()

    // Dialog should close
    await expect(dialog).not.toBeVisible()

    // Team should appear in the sidebar
    await expect(page.getByTestId('team-toggle-ENG')).toBeVisible()
  })

  test('should show validation error for invalid identifier', async ({
    page,
  }) => {
    await page.goto(`/workspace/${workspaceSlug}/my-issues`)

    await page.getByTestId('sidebar-create-team').click()

    const dialog = page.getByRole('dialog')
    await dialog.getByTestId('team-name-input').fill('Design')
    await dialog.getByTestId('team-identifier-input').fill('d')

    // Should show validation error
    await expect(
      dialog.getByText('Must be 2-5 uppercase letters'),
    ).toBeVisible()

    // Submit button should be disabled
    await expect(dialog.getByTestId('create-team-submit')).toBeDisabled()
  })

  test('should auto-uppercase identifier input', async ({ page }) => {
    await page.goto(`/workspace/${workspaceSlug}/my-issues`)

    await page.getByTestId('sidebar-create-team').click()

    const dialog = page.getByRole('dialog')
    await dialog.getByTestId('team-identifier-input').fill('eng')

    // Input should be uppercased
    await expect(dialog.getByTestId('team-identifier-input')).toHaveValue('ENG')
  })

  test('should navigate to settings page', async ({ page }) => {
    await page.goto(`/workspace/${workspaceSlug}/my-issues`)

    await page.getByTestId('sidebar-settings').click()

    await page.waitForURL(`/workspace/${workspaceSlug}/settings/general`)
    await expect(page.getByTestId('settings-layout')).toBeVisible()
    await expect(page.getByTestId('general-settings-page')).toBeVisible()
  })

  test('should list teams on settings page', async ({ page, api }) => {
    const ws = (await api.getWorkspaces()) as Array<{
      id: string
      slug: string
    }>
    const workspace = ws.find((w) => w.slug === workspaceSlug)!
    await api.createTeam(workspace.id, 'Engineering', 'ENG')
    await api.createTeam(workspace.id, 'Design', 'DES')

    await page.goto(`/workspace/${workspaceSlug}/settings/teams`)

    await expect(page.getByTestId('team-row-ENG')).toBeVisible()
    await expect(page.getByTestId('team-row-DES')).toBeVisible()
  })

  test('should edit team name on settings page', async ({ page, api }) => {
    const ws = (await api.getWorkspaces()) as Array<{
      id: string
      slug: string
    }>
    const workspace = ws.find((w) => w.slug === workspaceSlug)!
    await api.createTeam(workspace.id, 'Engineering', 'ENG')

    await page.goto(`/workspace/${workspaceSlug}/settings/teams`)

    await page.getByTestId('team-edit-ENG').click()
    const input = page.getByTestId('team-edit-name-ENG')
    await expect(input).toBeVisible()

    await input.clear()
    await input.fill('Platform Engineering')
    await page.getByTestId('team-save-ENG').click()

    // Should exit edit mode and show updated name
    await expect(page.getByTestId('team-row-ENG')).toContainText(
      'Platform Engineering',
    )
  })

  test('should delete team on settings page', async ({ page, api }) => {
    const ws = (await api.getWorkspaces()) as Array<{
      id: string
      slug: string
    }>
    const workspace = ws.find((w) => w.slug === workspaceSlug)!
    await api.createTeam(workspace.id, 'Engineering', 'ENG')

    await page.goto(`/workspace/${workspaceSlug}/settings/teams`)
    await expect(page.getByTestId('team-row-ENG')).toBeVisible()

    await page.getByTestId('team-delete-ENG').click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Engineering')

    await page.getByTestId('team-delete-confirm-ENG').click()

    // Team should be removed from the list
    await expect(page.getByTestId('team-row-ENG')).not.toBeVisible()
  })

  test('should create team from settings page', async ({ page }) => {
    await page.goto(`/workspace/${workspaceSlug}/settings/teams`)

    await expect(page.getByTestId('no-teams-message')).toBeVisible()

    await page.getByTestId('create-team-button').click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByTestId('team-name-input').fill('Backend')
    await dialog.getByTestId('team-identifier-input').fill('BE')
    await dialog.getByTestId('create-team-submit').click()

    await expect(dialog).not.toBeVisible()

    // Team should appear in the list
    await expect(page.getByTestId('team-row-BE')).toBeVisible()
  })
})
