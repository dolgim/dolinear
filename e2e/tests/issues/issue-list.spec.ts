import { test, expect } from '../../fixtures/base.fixture.js'

test.describe('Issue List', () => {
  test('should display issues created via API', async ({ page, api }) => {
    const workspace = await api.createWorkspace('Issue List Workspace')
    const team = await api.createTeam(workspace.id, 'Engineering', 'ENG')
    await api.createIssue(workspace.id, team.id, {
      title: 'First test issue',
    })
    await api.createIssue(workspace.id, team.id, {
      title: 'Second test issue',
    })

    await page.goto(`/workspace/${workspace.slug}/team/ENG/issues`)

    await expect(page.getByText('First test issue')).toBeVisible()
    await expect(page.getByText('Second test issue')).toBeVisible()
  })

  test('should show issues grouped by workflow state', async ({
    page,
    api,
  }) => {
    const workspace = await api.createWorkspace('Grouped Workspace')
    const team = await api.createTeam(workspace.id, 'Engineering', 'ENG')
    await api.createIssue(workspace.id, team.id, {
      title: 'Backlog issue',
    })

    await page.goto(`/workspace/${workspace.slug}/team/ENG/issues`)

    // Issue groups should be visible (default workflow states are created with the team)
    const groups = page.locator('[data-testid^="issue-group-"]')
    await expect(groups.first()).toBeVisible()
  })

  test('should navigate to issue detail on click', async ({ page, api }) => {
    const workspace = await api.createWorkspace('Detail Nav Workspace')
    const team = await api.createTeam(workspace.id, 'Engineering', 'ENG')
    await api.createIssue(workspace.id, team.id, {
      title: 'Clickable issue',
    })

    await page.goto(`/workspace/${workspace.slug}/team/ENG/issues`)

    await page.getByTestId('issue-row-ENG-1').click()
    await page.waitForURL(/\/issues\/ENG-1/)
  })
})
