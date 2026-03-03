import { test, expect } from '../../fixtures/base.fixture.js'

test.describe('Create Issue', () => {
  test('should create issue via dialog and show in list', async ({
    page,
    api,
  }) => {
    const workspace = await api.createWorkspace('Create Issue Workspace')
    await api.createTeam(workspace.id, 'Engineering', 'ENG')

    await page.goto(`/workspace/${workspace.slug}/team/ENG/issues`)
    await expect(
      page.getByRole('heading', { name: 'Issues', exact: true }),
    ).toBeVisible()

    // Press 'c' to open create issue dialog
    await page.keyboard.press('c')

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByLabel('Title').fill('New E2E issue')
    await dialog.getByLabel('Description').fill('Created by E2E test')
    await dialog.getByRole('button', { name: 'Create issue' }).click()

    // Dialog should close
    await expect(dialog).not.toBeVisible()

    // Issue should appear in the list
    await expect(page.getByText('New E2E issue')).toBeVisible()
  })
})
