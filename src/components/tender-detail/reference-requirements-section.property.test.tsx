import { describe, it, expect, vi } from 'vitest'
import * as fc from 'fast-check'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReferenceRequirementsSection } from './reference-requirements-section'
import type { TenderDetailResponse, ReferenceRequirement, ReferenceRequirementsData } from '@/api/types'

// Feature: tender-detail-overhaul, Property 4: Reference requirements rendering completeness
// **Validates: Requirements 4.1, 4.6**

vi.mock('@/hooks/useTenderActions', () => ({
  useTenderActions: () => ({
    extractTeam: { mutate: vi.fn(), isPending: false },
    runTeamMatch: { mutate: vi.fn(), isPending: false },
    extractReferences: { mutate: vi.fn(), isPending: false },
    runReferenceMatch: { mutate: vi.fn(), isPending: false },
    checkExclusion: { mutate: vi.fn(), isPending: false },
  }),
}))

// --- Arbitraries ---

const confidenceArb = fc.constantFrom('high' as const, 'medium' as const, 'low' as const)

const referenceRequirementArb: fc.Arbitrary<ReferenceRequirement> = fc.record({
  domain: fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{0,19}$/),
  mandatory: fc.boolean(),
  min_projects: fc.oneof(fc.integer({ min: 1, max: 20 }), fc.constant(null)),
  min_value_eur: fc.oneof(fc.double({ min: 1000, max: 10000000, noNaN: true }), fc.constant(null)),
  max_age_years: fc.oneof(fc.integer({ min: 1, max: 30 }), fc.constant(null)),
  region: fc.oneof(fc.stringMatching(/^[A-Za-z]{2,15}$/), fc.constant(null)),
  donor_preference: fc.oneof(fc.stringMatching(/^[A-Za-z]{2,15}$/), fc.constant(null)),
  notes: fc.oneof(fc.stringMatching(/^[A-Za-z0-9]{2,20}$/), fc.constant(null)),
})

const referenceRequirementsDataArb: fc.Arbitrary<ReferenceRequirementsData> = fc.record({
  reference_requirements: fc.array(referenceRequirementArb, { minLength: 1, maxLength: 5 }),
  total_references_required: fc.oneof(fc.integer({ min: 1, max: 10 }), fc.constant(null)),
  extraction_confidence: confidenceArb,
})

// --- Helpers ---

function buildMockTender(refReqs: ReferenceRequirementsData): TenderDetailResponse {
  return {
    source_id: 'src-1',
    tender_id: 'tid-1',
    title: 'Test Tender',
    posted_date: '2024-01-01',
    deadline: null,
    discovered_at: '2024-01-01T00:00:00Z',
    status: 'completed',
    fully_visible: true,
    budget: 0,
    currency: null,
    status_name: null,
    location_names: null,
    sectors: null,
    types: null,
    documents_total: 0,
    relevance_score: null,
    analysis_summary: null,
    analysis_tags: [],
    tender_type: null,
    analyzed_at: null,
    organization: null,
    interestingness_score: null,
    unified_score: null,
    pk: 'pk-1',
    retry_count: 0,
    last_attempt: null,
    last_error: null,
    s3_prefix: null,
    documents_downloaded: 0,
    documents_failed: 0,
    skip_reason: null,
    discovered_run_id: null,
    processed_run_id: null,
    detail: null,
    description_text: null,
    warnings: [],
    analysis_context: null,
    analysis_model: null,
    emailed_at: null,
    experts_required: null,
    references_required: null,
    turnover_required: null,
    team_requirements: null,
    team_match_result: null,
    reference_requirements: refReqs,
    reference_match_result: null,
    exclusion_result: null,
    feedback_type: null,
    interestingness_reasoning: null,
  }
}

function renderSection(tender: TenderDetailResponse) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ReferenceRequirementsSection tender={tender} sourceId="src-1" tenderId="tid-1" />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// --- Tests ---

describe('ReferenceRequirementsSection property tests', () => {
  // Feature: tender-detail-overhaul, Property 4: Reference requirements rendering completeness
  // **Validates: Requirements 4.1, 4.6**
  it('Property 4: renders N rows with correct domain text, confidence badge, and total required', () => {
    fc.assert(
      fc.property(referenceRequirementsDataArb, (refData) => {
        const tender = buildMockTender(refData)
        const { container, unmount } = renderSection(tender)

        // Assert: number of table body rows equals N requirements
        const tbodyRows = container.querySelectorAll('tbody tr')
        expect(tbodyRows.length).toBe(refData.reference_requirements.length)

        // Assert: each row contains the domain text
        for (const req of refData.reference_requirements) {
          const matches = screen.getAllByText(req.domain)
          expect(matches.length).toBeGreaterThanOrEqual(1)
        }

        // Assert: confidence badge is rendered
        const confidenceMatches = screen.getAllByText(refData.extraction_confidence)
        expect(confidenceMatches.length).toBeGreaterThanOrEqual(1)

        // Assert: total required count or "Unknown" is shown
        const expectedTotal = refData.total_references_required !== null
          ? String(refData.total_references_required)
          : 'Unknown'
        const totalMatches = screen.getAllByText(new RegExp(expectedTotal))
        expect(totalMatches.length).toBeGreaterThanOrEqual(1)

        unmount()
      }),
      { numRuns: 100 },
    )
  })
})
