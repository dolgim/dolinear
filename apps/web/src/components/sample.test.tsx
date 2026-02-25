import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/test-utils'

function Greeting({ name }: { name: string }) {
  return <h1>Hello, {name}!</h1>
}

describe('Test infrastructure', () => {
  it('renders a component with testing library', () => {
    render(<Greeting name="DOLinear" />)
    expect(screen.getByRole('heading')).toHaveTextContent('Hello, DOLinear!')
  })
})
