import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

function Example() {
  return <button type="button">Hello Ninewood</button>
}

describe('Example', () => {
  it('renders button text', () => {
    render(<Example />)
    expect(
      screen.getByRole('button', { name: 'Hello Ninewood' }),
    ).toBeInTheDocument()
  })
})
