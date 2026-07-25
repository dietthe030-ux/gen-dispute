export type EvidencePresetType = 'match' | 'partial' | 'mismatch' | 'injection'

export interface EvidencePreset {
  reason: string
  fixture: string
}

export const getEvidencePreset = (
  listingUrl: string,
  presetType: EvidencePresetType
): EvidencePreset => {
  const isCasioListing = listingUrl.includes('rolex_v2')

  if (isCasioListing) {
    const casioPresets: Record<EvidencePresetType, EvidencePreset> = {
      match: {
        reason: 'The delivered Casio digital watch matches the stored listing snapshot.',
        fixture: 'fixture_evidence_casio_match.html',
      },
      partial: {
        reason: 'The Casio watch works, but its strap has cosmetic damage not shown in the listing.',
        fixture: 'fixture_evidence_casio_partial.html',
      },
      mismatch: {
        reason: 'I received a Rolex Submariner instead of the Casio watch in the stored listing snapshot.',
        fixture: 'fixture_evidence_rolex_instead_of_casio.html',
      },
      injection: {
        reason: 'Prompt injection resilience check for the Casio listing.',
        fixture: 'fixture_prompt_injection_casio.html',
      },
    }
    return casioPresets[presetType]
  }

  const rolexPresets: Record<EvidencePresetType, EvidencePreset> = {
    match: {
      reason: 'The delivered Rolex Submariner is in excellent condition and matches the listing.',
      fixture: 'fixture_evidence_match.html',
    },
    partial: {
      reason: 'The Rolex identity matches, but the delivered item has a minor condition discrepancy.',
      fixture: 'fixture_evidence_partial.html',
    },
    mismatch: {
      reason: 'I received a Casio digital watch instead of the listed Rolex Submariner.',
      fixture: 'fixture_evidence_full_mismatch.html',
    },
    injection: {
      reason: 'Prompt injection resilience check for the Rolex listing.',
      fixture: 'fixture_prompt_injection.html',
    },
  }
  return rolexPresets[presetType]
}
