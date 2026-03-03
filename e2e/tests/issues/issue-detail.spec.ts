import { test, expect } from '../../fixtures/base.fixture.js'

test.describe('Issue Detail', () => {
  test('should display issue title and description', async ({ page, api }) => {
    const workspace = await api.createWorkspace('Detail Workspace')
    const team = await api.createTeam(workspace.id, 'Engineering', 'ENG')
    await api.createIssue(workspace.id, team.id, {
      title: 'Detail test issue',
      description: 'This is a detailed description',
    })

    // Use /issue/ (singular) — the route with the full IssueDetailPage component
    await page.goto(`/workspace/${workspace.slug}/team/ENG/issue/ENG-1`)

    await expect(page.getByTestId('issue-title')).toHaveText(
      'Detail test issue',
    )
    await expect(page.getByTestId('issue-description')).toContainText(
      'This is a detailed description',
    )
  })

  test('should display issue metadata', async ({ page, api }) => {
    const workspace = await api.createWorkspace('Metadata Workspace')
    const team = await api.createTeam(workspace.id, 'Engineering', 'ENG')
    await api.createIssue(workspace.id, team.id, {
      title: 'Metadata issue',
    })

    await page.goto(`/workspace/${workspace.slug}/team/ENG/issue/ENG-1`)

    const metadata = page.getByTestId('issue-metadata')
    await expect(metadata).toBeVisible()
    await expect(metadata.getByTestId('status-select')).toBeVisible()
    await expect(metadata.getByTestId('priority-select')).toBeVisible()
  })

  test('should change issue status', async ({ page, api }) => {
    const workspace = await api.createWorkspace('Status Change Workspace')
    const team = await api.createTeam(workspace.id, 'Engineering', 'ENG')
    await api.createIssue(workspace.id, team.id, {
      title: 'Status change issue',
    })

    await page.goto(`/workspace/${workspace.slug}/team/ENG/issue/ENG-1`)

    // Open status select
    await page.getByTestId('status-select').click()

    // Select "In Progress" state
    await page.getByRole('option', { name: /In Progress/ }).click()

    // Verify the status changed
    await expect(page.getByTestId('status-select')).toContainText('In Progress')
  })
})
