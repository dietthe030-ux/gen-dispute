import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DocsPage } from './DocsPage'

describe('DocsPage', () => {
  it('introduces the project, workflow, technology, and contract', () => {
    render(<DocsPage />)

    expect(
      screen.getByRole('heading', { name: 'Escrow that waits for evidence.' })
    ).toBeInTheDocument()
    expect(screen.getByText('From listing to settlement')).toBeInTheDocument()
    expect(screen.getByText('Built for verifiable judgment')).toBeInTheDocument()
    expect(screen.getByText('Contract reference')).toBeInTheDocument()
    expect(screen.getByText('get_order(order_id) -> dict')).toBeInTheDocument()
    expect(screen.getByText('Independent validator check')).toBeInTheDocument()
  })

  it('links back to the app and marks Docs as the current page', () => {
    render(<DocsPage />)

    expect(screen.getByRole('link', { name: 'Open the app' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute(
      'aria-current',
      'page'
    )
  })
})
