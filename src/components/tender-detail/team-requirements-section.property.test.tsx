import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TeamRequirementsSection } from './team-requirements-section'
import type { TenderDetailResponse, TeamRequirementsData } from '@/api/types'

// Feature: tender-detail-overhaul, Property 2: Team requirements rendering completeness
// **Validates: Requirements 2.1, 2.6**

vi.mock('@/api/endpoints', () => ({
  extractTeamRequirements: vi.fn(),
  runTeamMatch: vi.fn(),
  extractReferenceRequirements: vi.fn(),
  runReferenceMatch: vi.fn(),
  checkExclusion: vi.fn(),
}))

// --- Arbitraries ---

const nonEmptyString = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,19}$/)

const teamRequirementArb = fc.record({
  role: nonEmptyString,
  mandatory: fc.boolean(),
  min_years: fc.oneof(fc.integer({ min: 1, max: 30 }), fc.constant(null)),
  specializations: fc.array(nonEmptyString, { minLength: 0, maxLength: 3 }),
  languages: fc.array(nonEmptyString, { minLength: 0, maxLength: 3 }),
  notes: fc.constant(null),
})

const teamRequirementsDataArb: fc.Arbitrary<TeamRequirementsData> = fc.record({
  team_requirements: fc.array(teamRequirementArb, { minLength: 1, maxLength: 5 }),
  total_experts_required: fc.oneof(fc.integer({ min: 1, max: 20 }), fc.constant(null)),
  extraction_confidence: fc.constantFrom('high' as const, 'medium' as const, 'low' as const),
})

function buildMockTender(teamReqs: TeamRequirementsData): TenderDetailResponse {
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
    team_requirements: teamReqs,
    team_match_result: null,
    reference_requirements: null,
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
        <TeamRequirementsSection
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

describe('TeamRequirementsSection property tests', () => {
  // Feature: tender-detail-overhaul, Property 2: Team requirements rendering completeness
  // **Validates: Requirements 2.1, 2.6**
  it('Property 2: renders N rows with correct fields for N team requirements', () => {
    fc.assert(
      fc.property(teamRequirementsDataArb, (teamReqs) => {
        const tender = buildMockTender(teamReqs)
        const { unmount, container } = renderSection(tender)

        // Assert: number of table body rows equals N requirements
        const tbody = container.querySelector('tbody')
        expect(tbody).not.toBeNull()
        const rows = tbody!.querySelectorAll('tr')
        expect(rows.length).toBe(teamReqs.team_requirements.length)

        // Assert: each row contains the role name
        teamReqs.team_requirements.forEach((req, idx) => {
          const row = rows[idx]
          expect(row.textContent).toContain(req.role)
        })

        // Assert: confidence badge is rendered
        const confidenceBadges = screen.getAllByText(teamReqs.extraction_confidence)
        expect(confidenceBadges.length).toBeGreaterThanOrEqual(1)

        // Assert: total experts count or "Unknown" is shown
        const expectedExperts = teamReqs.total_experts_required != null
          ? String(teamReqs.total_experts_required)
          : 'Unknown'
        const expertsMatches = screen.getAllByText((_content, element) => {
          return element?.textContent?.includes(expectedExperts) === true
            && element?.textContent?.includes('Experts required') === true
        })
        expect(expertsMatches.length).toBeGreaterThanOrEqual(1)

        unmount()
      }),
      { numRuns: 100 },
    )
  })
})
