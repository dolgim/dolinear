import { screen } from '@testing-library/react'
import { render } from '@/test/test-utils'

function Greeting({ name }: { name: string }) {
  return <h1>Hello, {name}!</h1>
}

describe('Test infrastructure', () => {
  it('renders a component with testing library', () => {
    render(<Greeting name="DOLinear" />)
    expect(screen.getByRole('heading')).toHaveTextContent('Hello, DOLinear!')
  })
})
