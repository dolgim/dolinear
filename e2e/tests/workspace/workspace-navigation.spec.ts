import { test, expect } from '../../fixtures/base.fixture.js'

test.describe('Workspace Navigation', () => {
  test('should show team tree in sidebar', async ({ page, api }) => {
    const workspace = await api.createWorkspace('Nav Workspace')
    await api.createTeam(workspace.id, 'Engineering', 'ENG')

    await page.goto(`/workspace/${workspace.slug}`)

    const sidebar = page.getByTestId('sidebar')
    await expect(sidebar).toBeVisible()

    // Toggle team to reveal links
    await page.getByTestId('team-toggle-ENG').click()

    const teamLinks = page.getByTestId('team-links-ENG')
    await expect(teamLinks).toBeVisible()
    await expect(teamLinks.getByRole('link', { name: 'Issues' })).toBeVisible()
    await expect(teamLinks.getByRole('link', { name: 'Active' })).toBeVisible()
    await expect(teamLinks.getByRole('link', { name: 'Backlog' })).toBeVisible()
  })

  test('should navigate to Issues page via sidebar', async ({ page, api }) => {
    const workspace = await api.createWorkspace('Issues Nav Workspace')
    await api.createTeam(workspace.id, 'Engineering', 'ENG')

    await page.goto(`/workspace/${workspace.slug}`)

    await page.getByTestId('team-toggle-ENG').click()
    await page
      .getByTestId('team-links-ENG')
      .getByRole('link', { name: 'Issues' })
      .click()

    await page.waitForURL(/\/team\/ENG\/issues/)
    await expect(page.getByRole('heading', { name: 'Issues' })).toBeVisible()
  })

  test('should navigate to My Issues', async ({ page, api }) => {
    const workspace = await api.createWorkspace('My Issues Workspace')

    await page.goto(`/workspace/${workspace.slug}`)

    await page.getByRole('link', { name: 'My Issues' }).click()
    await page.waitForURL(/\/my-issues/)
  })

  test('should switch workspaces via workspace switcher', async ({
    page,
    api,
  }) => {
    const ws1 = await api.createWorkspace('First Workspace')
    await api.createWorkspace('Second Workspace')

    await page.goto(`/workspace/${ws1.slug}`)

    await page.getByTestId('workspace-switcher').click()
    await page.getByText('Second Workspace').click()

    await page.waitForURL(/\/workspace\/second-workspace/)
  })
})
