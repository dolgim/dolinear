import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/test-utils'
import { Input } from './Input'

describe('Input', () => {
  it('renders with label', () => {
    render(<Input id="email" label="Email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('handles value changes', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Input id="name" label="Name" onChange={handleChange} />)

    const input = screen.getByLabelText('Name')
    await user.type(input, 'Hello')
    expect(handleChange).toHaveBeenCalled()
    expect(input).toHaveValue('Hello')
  })

  it('displays error message', () => {
    render(<Input id="email" label="Email" error="Email is required" />)
    expect(screen.getByText('Email is required')).toBeInTheDocument()
  })

  it('applies error border style', () => {
    render(<Input id="email" error="Required" />)
    const input = screen.getByRole('textbox')
    expect(input.className).toContain('border-red-500')
  })

  it('renders without label', () => {
    render(<Input id="test" placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
    expect(screen.queryByRole('label')).not.toBeInTheDocument()
  })
})
