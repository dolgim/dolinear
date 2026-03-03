import { test, expect } from '../../fixtures/base.fixture.js'

test.describe('Create Issue', () => {
  test('should create issue via keyboard shortcut', async ({ page, api }) => {
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

  test('should create issue via header button', async ({ page, api }) => {
    const workspace = await api.createWorkspace('Header Button Workspace')
    await api.createTeam(workspace.id, 'Engineering', 'ENG')

    await page.goto(`/workspace/${workspace.slug}/team/ENG/issues`)
    await expect(
      page.getByRole('heading', { name: 'Issues', exact: true }),
    ).toBeVisible()

    // Click the header "Create issue" button
    await page.getByTestId('create-issue-button').click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByLabel('Title').fill('Issue from header button')
    await dialog.getByRole('button', { name: 'Create issue' }).click()

    await expect(dialog).not.toBeVisible()
    await expect(page.getByText('Issue from header button')).toBeVisible()
  })

  test('should create issue via sidebar button', async ({ page, api }) => {
    const workspace = await api.createWorkspace('Sidebar Button Workspace')
    const team = await api.createTeam(workspace.id, 'Engineering', 'ENG')

    await page.goto(`/workspace/${workspace.slug}/team/ENG/issues`)
    await expect(
      page.getByRole('heading', { name: 'Issues', exact: true }),
    ).toBeVisible()

    // Hover the team section to reveal the "+" button, then click it
    const teamToggle = page.getByTestId(`team-toggle-${team.identifier}`)
    await teamToggle.hover()
    await page.getByTestId(`sidebar-create-issue-${team.identifier}`).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByLabel('Title').fill('Issue from sidebar')
    await dialog.getByRole('button', { name: 'Create issue' }).click()

    await expect(dialog).not.toBeVisible()
    await expect(page.getByText('Issue from sidebar')).toBeVisible()
  })
})
