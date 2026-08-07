import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DisputeForm } from './DisputeForm'
import { EvidenceReceiptForm } from './EvidenceReceiptForm'

describe('order-bound evidence flow', () => {
  it('lets the buyer submit only a reason, not an outcome or evidence URL', () => {
    const onSubmit = vi.fn()
    render(<DisputeForm onSubmit={onSubmit} isLoading={false} attempts={0} />)

    expect(screen.queryByText('Mismatch (100%)')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Evidence URL/i)).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'The delivered item is different.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit dispute' }))
    expect(onSubmit).toHaveBeenCalledWith('The delivered item is different.')
  })

  it('rejects a buyer reason that is too short', () => {
    const onSubmit = vi.fn()
    render(<DisputeForm onSubmit={onSubmit} isLoading={false} attempts={0} />)
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'bad' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit dispute' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('at least 5 characters')
  })

  it('validates the issuer receipt hash before registration', () => {
    const onSubmit = vi.fn()
    render(<EvidenceReceiptForm onSubmit={onSubmit} isLoading={false} isRetry={false} />)
    fireEvent.change(screen.getByLabelText('Receipt URL'), {
      target: { value: 'https://gen-dispute.vercel.app/fixtures/order-0.html' },
    })
    fireEvent.change(screen.getByLabelText('Receipt SHA-256'), { target: { value: 'bad' } })
    fireEvent.change(screen.getByLabelText('One-time evidence nonce'), { target: { value: 'ORDER_0_V1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Register receipt' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('64-character SHA-256')
  })
})
