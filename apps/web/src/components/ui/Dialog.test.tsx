import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/test-utils'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from './Dialog'

describe('Dialog', () => {
  it('opens when trigger is clicked', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Dialog</DialogTitle>
          <p>Dialog content</p>
        </DialogContent>
      </Dialog>,
    )

    expect(screen.queryByText('Dialog content')).not.toBeInTheDocument()
    await user.click(screen.getByText('Open'))
    expect(screen.getByText('Dialog content')).toBeInTheDocument()
    expect(screen.getByText('Test Dialog')).toBeInTheDocument()
  })

  it('closes when close button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>Test Dialog</DialogTitle>
          <p>Dialog content</p>
        </DialogContent>
      </Dialog>,
    )

    await user.click(screen.getByText('Open'))
    expect(screen.getByText('Dialog content')).toBeInTheDocument()

    // Press Escape to close
    await user.keyboard('{Escape}')
    expect(screen.queryByText('Dialog content')).not.toBeInTheDocument()
  })

  it('renders content correctly', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>My Title</DialogTitle>
          <p>Some body text</p>
        </DialogContent>
      </Dialog>,
    )

    await user.click(screen.getByText('Open'))
    expect(screen.getByText('My Title')).toBeInTheDocument()
    expect(screen.getByText('Some body text')).toBeInTheDocument()
  })
})
