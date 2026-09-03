import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ExclusionCriteriaSection } from './exclusion-criteria-section'
import type { TenderDetailResponse, ExclusionResult, ExclusionCategory, ExclusionCriterion } from '@/api/types'

// Feature: tender-detail-overhaul, Property 7: Exclusion criteria section rendering
// **Validates: Requirements 6.3, 6.5, 6.9**

vi.mock('@/hooks/useTenderActions', () => ({
  useTenderActions: () => ({
    extractTeam: { mutate: vi.fn(), isPending: false },
    runTeamMatch: { mutate: vi.fn(), isPending: false },
    extractReferences: { mutate: vi.fn(), isPending: false },
    runReferenceMatch: { mutate: vi.fn(), isPending: false },
    exclusionCheck: { mutate: vi.fn(), isPending: false },
  }),
}))

// --- Arbitraries ---

const confidenceArb = fc.constantFrom('high' as const, 'medium' as const, 'low' as const)

const exclusionCategoryArb: fc.Arbitrary<ExclusionCategory> = fc.constantFrom(
  'financial', 'legal', 'experience', 'accreditation', 'geographic', 'consortium', 'capacity'
)

const exclusionCriterionArb: fc.Arbitrary<ExclusionCriterion> = fc.record({
  criterion: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,29}$/),
  category: exclusionCategoryArb,
  assessment: fc.constantFrom('pass' as const, 'fail' as const, 'uncertain' as const),
  confidence: confidenceArb,
  reason: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,39}$/),
})

const exclusionResultArb: fc.Arbitrary<ExclusionResult> = fc.record({
  criteria: fc.array(exclusionCriterionArb, { minLength: 1, maxLength: 5 }),
  excluded: fc.boolean(),
  exclusion_reasons: fc.array(fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,29}$/), { minLength: 0, maxLength: 3 }),
  uncertain_flags: fc.array(fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,29}$/), { minLength: 0, maxLength: 3 }),
  extraction_confidence: confidenceArb,
})

function buildMockTender(exclusionResult: ExclusionResult): TenderDetailResponse {
  return {
    source_id: 'test-source',
    tender_id: 'test-tender',
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
    pk: 'test-pk',
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
    reference_requirements: null,
    reference_match_result: null,
    exclusion_result: exclusionResult,
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
        <ExclusionCriteriaSection
          tender={tender}
          sourceId="test-source"
          tenderId="test-tender"
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ExclusionCriteriaSection property tests', () => {
  // Feature: tender-detail-overhaul, Property 7: Exclusion criteria section rendering
  // **Validates: Requirements 6.3, 6.5, 6.9**
  it('Property 7: renders M rows, confidence badge, and warning callout when uncertain_flags > 0', () => {
    fc.assert(
      fc.property(exclusionResultArb, (exclusionResult) => {
        const tender = buildMockTender(exclusionResult)
        const { unmount, container } = renderSection(tender)

        // Assert: number of table body rows equals M criteria
        const tbody = container.querySelector('tbody')
        expect(tbody).not.toBeNull()
        const rows = tbody!.querySelectorAll('tr')
        expect(rows.length).toBe(exclusionResult.criteria.length)

        // Assert: confidence badge (extraction_confidence text) appears
        const confidenceBadges = screen.getAllByText(exclusionResult.extraction_confidence)
        expect(confidenceBadges.length).toBeGreaterThanOrEqual(1)

        // Assert: when uncertain_flags.length > 0, each flag text appears in rendered output
        if (exclusionResult.uncertain_flags.length > 0) {
          const content = container.textContent ?? ''
          for (const flag of exclusionResult.uncertain_flags) {
            expect(content).toContain(flag)
          }
        }

        unmount()
      }),
      { numRuns: 100 },
    )
  })
})
