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
    expect(screen.getByText('Evidence commitment')).toBeInTheDocument()
    expect(screen.getByText(/Missing evidence fails closed as undetermined/)).toBeInTheDocument()
    expect(screen.getByText(/Candidate fixtures cover order 0 and exact orders 1, 3, 4, 5, and 6/)).toBeInTheDocument()
    expect(screen.getByText('confirm_delivery(order_id) -> None')).toBeInTheDocument()
    expect(screen.getByText('recover_expired_order(order_id) -> None')).toBeInTheDocument()
    expect(screen.getByText('upgrade(new_code) -> None')).toBeInTheDocument()
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
