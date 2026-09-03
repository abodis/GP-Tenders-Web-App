import { describe, it, expect, vi } from 'vitest'
import * as fc from 'fast-check'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReferenceMatchSection } from './reference-match-section'
import type {
  TenderDetailResponse,
  ReferenceMatchResult,
  RequirementMatch,
  ReferenceBestMatch,
  ReferenceGapEntry,
} from '@/api/types'

// Feature: tender-detail-overhaul, Property 5: Reference match result rendering completeness
// **Validates: Requirements 5.2, 5.3**

vi.mock('@/api/client', () => ({
  apiFetch: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
}))

function buildBaseTender(): TenderDetailResponse {
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
    reference_requirements: {
      reference_requirements: [],
      total_references_required: null,
      extraction_confidence: 'high',
    },
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
        <ReferenceMatchSection tender={tender} sourceId="src-1" tenderId="tid-1" />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// --- Arbitraries ---

const referenceBestMatchArb: fc.Arbitrary<ReferenceBestMatch> = fc.record({
  id: fc.uuid(),
  title: fc.array(fc.stringMatching(/^[A-Za-z]{2,8}$/), { minLength: 1, maxLength: 3 }).map((w) => w.join(' ')),
  match_score: fc.double({ min: 0, max: 1, noNaN: true }),
  match_factors: fc.dictionary(
    fc.stringMatching(/^[a-z]{3,8}$/),
    fc.double({ min: 0, max: 1, noNaN: true }),
    { minKeys: 1, maxKeys: 3 },
  ),
  consortium_coverage: fc.boolean(),
})

// Domain: words separated by single spaces (no consecutive spaces which confuse DOM text matching)
const domainArb = fc
  .array(fc.stringMatching(/^[A-Za-z]{2,8}$/), { minLength: 1, maxLength: 3 })
  .map((words) => words.join(' '))

const requirementMatchArb: fc.Arbitrary<RequirementMatch> = fc.record({
  domain: domainArb,
  mandatory: fc.boolean(),
  best_matches: fc.array(referenceBestMatchArb, { minLength: 1, maxLength: 4 }),
  status: fc.constantFrom('matched' as const, 'partial' as const, 'gap' as const),
  coverage_count: fc.integer({ min: 0, max: 10 }),
  gap_note: fc.oneof(fc.constant(null), fc.stringMatching(/^[A-Za-z]{3,12}$/)),
})

const referenceGapArb: fc.Arbitrary<ReferenceGapEntry> = fc.record({
  domain: domainArb,
  mandatory: fc.boolean(),
  severity: fc.constantFrom('high' as const, 'low' as const),
})

const referenceMatchResultArb: fc.Arbitrary<ReferenceMatchResult> = fc.record({
  reference_match_score: fc.double({ min: 0, max: 1, noNaN: true }),
  requirement_matches: fc.array(requirementMatchArb, { minLength: 1, maxLength: 5 }),
  gaps: fc.array(referenceGapArb, { minLength: 0, maxLength: 3 }),
  consortium_note: fc.constant(null),
  message: fc.constant(null),
})

describe('ReferenceMatchSection property tests', () => {
  // Feature: tender-detail-overhaul, Property 5: Reference match result rendering completeness
  // **Validates: Requirements 5.2, 5.3**
  it('Property 5: score percentage displayed, all requirement domains rendered, gaps shown', () => {
    fc.assert(
      fc.property(referenceMatchResultArb, (matchResult) => {
        const tender = buildBaseTender()
        tender.reference_match_result = matchResult

        const { unmount } = renderSection(tender)

        // Assert score percentage is displayed
        const expectedPercentage = `${Math.round(matchResult.reference_match_score * 100)}%`
        expect(screen.getAllByText(expectedPercentage).length).toBeGreaterThanOrEqual(1)

        // Assert each requirement match domain appears in output
        for (const reqMatch of matchResult.requirement_matches) {
          expect(screen.getAllByText(reqMatch.domain).length).toBeGreaterThanOrEqual(1)
        }

        // Assert gap entries appear when present
        for (const gap of matchResult.gaps) {
          expect(screen.getAllByText(gap.domain).length).toBeGreaterThanOrEqual(1)
        }

        unmount()
      }),
      { numRuns: 100 },
    )
  })
})
