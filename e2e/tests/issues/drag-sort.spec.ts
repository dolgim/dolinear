import { test, expect } from '../../fixtures/base.fixture.js'

test.describe('Drag and Drop Issue Sorting', () => {
  test('should display drag handles on issue rows', async ({ page, api }) => {
    const workspace = await api.createWorkspace('DnD Handle Workspace')
    const team = await api.createTeam(workspace.id, 'Engineering', 'ENG')
    await api.createIssue(workspace.id, team.id, { title: 'Issue A' })

    await page.goto(`/workspace/${workspace.slug}/team/ENG/issues`)
    await expect(page.getByTestId('issue-row-ENG-1')).toBeVisible()
    await expect(page.getByTestId('drag-handle-ENG-1')).toBeAttached()
  })

  test('should reorder issues via drag and drop', async ({ page, api }) => {
    const workspace = await api.createWorkspace('DnD Sort Workspace')
    const team = await api.createTeam(workspace.id, 'Engineering', 'ENG')
    // Create 3 issues (newer issues get lower sortOrder → appear first)
    await api.createIssue(workspace.id, team.id, { title: 'Issue One' })
    await api.createIssue(workspace.id, team.id, { title: 'Issue Two' })
    await api.createIssue(workspace.id, team.id, { title: 'Issue Three' })

    await page.goto(`/workspace/${workspace.slug}/team/ENG/issues`)

    // Verify initial order: newest first (Issue Three, Issue Two, Issue One)
    const rows = page.locator('[data-testid^="issue-row-ENG-"]')
    await expect(rows).toHaveCount(3)
    await expect(rows.nth(0)).toContainText('Issue Three')
    await expect(rows.nth(1)).toContainText('Issue Two')
    await expect(rows.nth(2)).toContainText('Issue One')

    // Drag the first issue (Issue Three) to the third position
    const dragHandle = page.getByTestId('drag-handle-ENG-3')
    const targetRow = page.getByTestId('issue-row-ENG-1')

    await dragHandle.dragTo(targetRow)

    // After drag: Issue Two, Issue One, Issue Three
    await expect(rows.nth(0)).toContainText('Issue Two')
    await expect(rows.nth(1)).toContainText('Issue One')
    await expect(rows.nth(2)).toContainText('Issue Three')
  })

  test('should persist sort order after page reload', async ({ page, api }) => {
    const workspace = await api.createWorkspace('DnD Persist Workspace')
    const team = await api.createTeam(workspace.id, 'Engineering', 'ENG')
    await api.createIssue(workspace.id, team.id, { title: 'Alpha' })
    await api.createIssue(workspace.id, team.id, { title: 'Beta' })

    await page.goto(`/workspace/${workspace.slug}/team/ENG/issues`)

    const rows = page.locator('[data-testid^="issue-row-ENG-"]')
    await expect(rows).toHaveCount(2)
    // Initial: Beta (newest), Alpha
    await expect(rows.nth(0)).toContainText('Beta')
    await expect(rows.nth(1)).toContainText('Alpha')

    // Drag Beta below Alpha
    const dragHandle = page.getByTestId('drag-handle-ENG-2')
    const targetRow = page.getByTestId('issue-row-ENG-1')
    await dragHandle.dragTo(targetRow)

    // After drag: Alpha, Beta
    await expect(rows.nth(0)).toContainText('Alpha')
    await expect(rows.nth(1)).toContainText('Beta')

    // Reload and verify order persists
    await page.reload()
    const reloadedRows = page.locator('[data-testid^="issue-row-ENG-"]')
    await expect(reloadedRows).toHaveCount(2)
    await expect(reloadedRows.nth(0)).toContainText('Alpha')
    await expect(reloadedRows.nth(1)).toContainText('Beta')
  })

  test('should still allow keyboard navigation (j/k) after DnD setup', async ({
    page,
    api,
  }) => {
    const workspace = await api.createWorkspace('DnD Keyboard Workspace')
    const team = await api.createTeam(workspace.id, 'Engineering', 'ENG')
    await api.createIssue(workspace.id, team.id, { title: 'Nav Issue A' })
    await api.createIssue(workspace.id, team.id, { title: 'Nav Issue B' })

    await page.goto(`/workspace/${workspace.slug}/team/ENG/issues`)
    await expect(page.getByTestId('issue-row-ENG-1')).toBeVisible()

    // Press j to select first item
    await page.keyboard.press('j')
    // First issue row should be selected (highlighted)
    const firstRow = page.getByTestId('issue-row-ENG-2')
    await expect(firstRow).toHaveClass(/bg-white\/10/)

    // Press j again to move to second
    await page.keyboard.press('j')
    const secondRow = page.getByTestId('issue-row-ENG-1')
    await expect(secondRow).toHaveClass(/bg-white\/10/)
  })
})
