import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DisputeForm } from './DisputeForm'
import { getEvidencePreset } from './evidencePresets'

describe('DisputeForm evidence presets', () => {
  it('uses fact-only Rolex evidence for a Rolex listing', () => {
    expect(getEvidencePreset('https://listing.url', 'mismatch')).toEqual({
      reason: 'I received a Casio digital watch instead of the listed Rolex Submariner.',
      fixture: 'fixture_evidence_full_mismatch.html',
    })
  })

  it('uses Casio-specific evidence for the Version B listing', () => {
    expect(getEvidencePreset('https://listing.url/rolex_v2', 'mismatch')).toEqual({
      reason: 'I received a Rolex Submariner instead of the Casio watch in the stored listing snapshot.',
      fixture: 'fixture_evidence_rolex_instead_of_casio.html',
    })
  })

  it('fills a consistent mismatch claim for the currently selected Casio order', () => {
    const onSubmit = vi.fn()
    render(
      <DisputeForm
        onSubmit={onSubmit}
        isLoading={false}
        attempts={0}
        listingUrl="https://listing.url/rolex_v2"
        orderId={7}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Mismatch (100%)' }))

    expect(screen.getByLabelText('Reason')).toHaveValue(
      'I received a Rolex Submariner instead of the Casio watch in the stored listing snapshot.'
    )
    expect(screen.getByLabelText('Evidence URL 1')).toHaveValue(
      'https://gen-dispute.vercel.app/fixtures/fixture_evidence_rolex_instead_of_casio.html?order_id=7'
    )
    expect(screen.getByText('Test evidence for the Casio listing')).toBeInTheDocument()
  })

  it('rejects evidence outside the frozen source registry', () => {
    const onSubmit = vi.fn()
    render(
      <DisputeForm
        onSubmit={onSubmit}
        isLoading={false}
        attempts={0}
        listingUrl="https://listing.url"
        orderId={0}
      />
    )

    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'The delivered item is different.' },
    })
    fireEvent.change(screen.getByLabelText('Evidence URL 1'), {
      target: { value: 'https://buyer.example/evidence.html' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit dispute' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('registered immutable demo fixture')
  })
})
