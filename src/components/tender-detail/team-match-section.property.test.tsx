import { describe, it, expect, vi } from 'vitest'
import fc from 'fast-check'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { TeamMatchSection } from './team-match-section'
import type { TenderDetailResponse, TeamMatchResult, BestMatch, RoleMatch, GapEntry } from '@/api/types'

vi.mock('@/api/client', () => ({
  apiFetch: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
}))

// Feature: tender-detail-overhaul, Property 3: Team match result rendering completeness
describe('TeamMatchSection property tests', () => {
  // **Validates: Requirements 3.2, 3.3, 3.4**

  // --- Arbitraries ---

  // Use alphanumeric IDs to avoid path normalization issues with slashes
  const safeIdArb = fc.stringMatching(/^[a-z0-9]{1,10}$/)

  const bestMatchArb: fc.Arbitrary<BestMatch> = fc.record({
    id: safeIdArb,
    name: fc.string({ minLength: 1, maxLength: 20 }),
    type: fc.constantFrom('employee' as const, 'contractor' as const),
    match_score: fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
    duplicate_roles: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 0, maxLength: 2 }),
  })

  const roleMatchArb: fc.Arbitrary<RoleMatch> = fc.record({
    required_role: fc.string({ minLength: 1, maxLength: 20 }),
    mandatory: fc.boolean(),
    match_score: fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
    status: fc.constantFrom('matched' as const, 'partial' as const, 'gap' as const),
    best_match: fc.oneof(bestMatchArb, fc.constant(null)),
  })

  const gapEntryArb: fc.Arbitrary<GapEntry> = fc.record({
    role: fc.string({ minLength: 1, maxLength: 20 }),
    mandatory: fc.boolean(),
    severity: fc.constantFrom('high' as const, 'low' as const),
  })

  const teamMatchResultArb: fc.Arbitrary<TeamMatchResult> = fc.record({
    team_match_score: fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
    role_matches: fc.array(roleMatchArb, { minLength: 1, maxLength: 5 }),
    gaps: fc.array(gapEntryArb, { minLength: 0, maxLength: 3 }),
    external_experts_needed: fc.integer({ min: 0, max: 5 }),
    message: fc.oneof(fc.string({ minLength: 1, maxLength: 30 }), fc.constant(null)),
  })

  function makeTender(matchResult: TeamMatchResult): TenderDetailResponse {
    return {
      source_id: 'src1',
      tender_id: 'tid1',
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
      pk: 'pk1',
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
      team_requirements: {
        team_requirements: [],
        total_experts_required: 3,
        extraction_confidence: 'high',
      },
      team_match_result: matchResult,
      reference_requirements: null,
      reference_match_result: null,
      exclusion_result: null,
      feedback_type: null,
      interestingness_reasoning: null,
    } as TenderDetailResponse
  }

  function renderComponent(tender: TenderDetailResponse) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TeamMatchSection tender={tender} sourceId="src1" tenderId="tid1" />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('Property 3: score percentage is displayed correctly', () => {
    fc.assert(
      fc.property(teamMatchResultArb, (matchResult) => {
        const tender = makeTender(matchResult)
        const { container } = renderComponent(tender)

        const expectedPercentage = Math.round(matchResult.team_match_score * 100)
        expect(container.textContent).toContain(`${expectedPercentage}%`)
      }),
      { numRuns: 100 }
    )
  })

  it('Property 3: number of table body rows equals role_matches count', () => {
    fc.assert(
      fc.property(teamMatchResultArb, (matchResult) => {
        const tender = makeTender(matchResult)
        const { container } = renderComponent(tender)

        const tbody = container.querySelector('tbody')
        expect(tbody).not.toBeNull()
        const rows = tbody!.querySelectorAll('tr')
        expect(rows.length).toBe(matchResult.role_matches.length)
      }),
      { numRuns: 100 }
    )
  })

  it('Property 3: each role name appears in rendered output', () => {
    fc.assert(
      fc.property(teamMatchResultArb, (matchResult) => {
        const tender = makeTender(matchResult)
        const { container } = renderComponent(tender)

        for (const rm of matchResult.role_matches) {
          expect(container.textContent).toContain(rm.required_role)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('Property 3: gap entries are rendered when present', () => {
    const withGapsArb = teamMatchResultArb.filter((r) => r.gaps.length > 0)

    fc.assert(
      fc.property(withGapsArb, (matchResult) => {
        const tender = makeTender(matchResult)
        const { container } = renderComponent(tender)

        for (const gap of matchResult.gaps) {
          expect(container.textContent).toContain(gap.role)
        }
      }),
      { numRuns: 50 }
    )
  })

  it('Property 3: links to /team/{id} exist for role matches with best_match', () => {
    const withBestMatchArb = teamMatchResultArb.filter((r) =>
      r.role_matches.some((rm) => rm.best_match !== null)
    )

    fc.assert(
      fc.property(withBestMatchArb, (matchResult) => {
        const tender = makeTender(matchResult)
        const { container } = renderComponent(tender)

        const links = container.querySelectorAll('a')
        const hrefs = Array.from(links).map((a) => a.getAttribute('href'))

        for (const rm of matchResult.role_matches) {
          if (rm.best_match) {
            expect(hrefs).toContain(`/team/${rm.best_match.id}`)
          }
        }
      }),
      { numRuns: 50 }
    )
  })

  it('Property 3: score color is green for >=0.7, amber for [0.4,0.7), red for <0.4', () => {
    fc.assert(
      fc.property(teamMatchResultArb, (matchResult) => {
        const tender = makeTender(matchResult)
        const { container } = renderComponent(tender)

        const scoreEl = container.querySelector('.text-2xl')
        expect(scoreEl).not.toBeNull()
        const classes = scoreEl!.className

        if (matchResult.team_match_score >= 0.7) {
          expect(classes).toContain('text-green')
        } else if (matchResult.team_match_score >= 0.4) {
          expect(classes).toContain('text-yellow')
        } else {
          expect(classes).toContain('text-red')
        }
      }),
      { numRuns: 100 }
    )
  })
})
