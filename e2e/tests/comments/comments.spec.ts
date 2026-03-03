import { test, expect } from '../../fixtures/base.fixture.js'

test.describe('Comments', () => {
  test('should add a comment', async ({ page, api }) => {
    const workspace = await api.createWorkspace('Comment Workspace')
    const team = await api.createTeam(workspace.id, 'Engineering', 'ENG')
    await api.createIssue(workspace.id, team.id, {
      title: 'Commentable issue',
    })

    // Use /issue/ (singular) — the route with the full detail page + comments
    await page.goto(`/workspace/${workspace.slug}/team/ENG/issue/ENG-1`)

    await page.getByTestId('comment-input').fill('This is a test comment')
    await page.getByTestId('submit-comment').click()

    await expect(page.getByTestId('comment-list')).toContainText(
      'This is a test comment',
    )
  })

  test('should edit a comment', async ({ page, api }) => {
    const workspace = await api.createWorkspace('Edit Comment Workspace')
    const team = await api.createTeam(workspace.id, 'Engineering', 'ENG')
    const issue = await api.createIssue(workspace.id, team.id, {
      title: 'Edit comment issue',
    })
    await api.createComment(workspace.id, team.id, issue.id, 'Original comment')

    await page.goto(`/workspace/${workspace.slug}/team/ENG/issue/ENG-1`)

    await expect(page.getByText('Original comment')).toBeVisible()

    // Open comment actions menu
    await page.getByTestId('comment-actions').click()
    await page.getByTestId('edit-comment').click()

    // Edit the comment
    const editInput = page.getByTestId('comment-edit-input')
    await editInput.clear()
    await editInput.fill('Updated comment text')
    await page.getByTestId('save-edit').click()

    await expect(page.getByText('Updated comment text')).toBeVisible()
    await expect(page.getByText('Original comment')).not.toBeVisible()
  })

  test('should delete a comment', async ({ page, api }) => {
    const workspace = await api.createWorkspace('Delete Comment Workspace')
    const team = await api.createTeam(workspace.id, 'Engineering', 'ENG')
    const issue = await api.createIssue(workspace.id, team.id, {
      title: 'Delete comment issue',
    })
    await api.createComment(
      workspace.id,
      team.id,
      issue.id,
      'Comment to delete',
    )

    await page.goto(`/workspace/${workspace.slug}/team/ENG/issue/ENG-1`)

    await expect(page.getByText('Comment to delete')).toBeVisible()

    // Open comment actions menu and delete
    await page.getByTestId('comment-actions').click()
    await page.getByTestId('delete-comment').click()

    // Confirm deletion
    await page.getByTestId('confirm-delete').click()

    await expect(page.getByText('Comment to delete')).not.toBeVisible()
  })
})
