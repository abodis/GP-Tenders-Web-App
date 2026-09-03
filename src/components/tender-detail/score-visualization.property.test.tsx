import { describe, it, expect, vi } from 'vitest'
import fc from 'fast-check'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { TeamMatchSection } from './team-match-section'
import type { TenderDetailResponse } from '@/api/types'

vi.mock('@/api/client', () => ({
  apiFetch: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
}))

// Feature: tender-detail-overhaul, Property 1: Score visualization maps [0,1] to colored percentage
describe('Score visualization color mapping property tests', () => {
  // **Validates: Requirements 3.1, 5.1**

  const scoreArb = fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true })

  function makeTenderWithScore(score: number): TenderDetailResponse {
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
      team_match_result: {
        team_match_score: score,
        role_matches: [
          {
            required_role: 'Engineer',
            mandatory: true,
            match_score: score,
            status: 'matched',
            best_match: null,
          },
        ],
        gaps: [],
        external_experts_needed: 0,
        message: null,
      },
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

  it('Property 1: displayed value equals round(score×100)%', () => {
    fc.assert(
      fc.property(scoreArb, (score) => {
        const tender = makeTenderWithScore(score)
        const { container } = renderComponent(tender)

        const expectedPercentage = Math.round(score * 100)
        const scoreEl = container.querySelector('.text-2xl')
        expect(scoreEl).not.toBeNull()
        expect(scoreEl!.textContent).toBe(`${expectedPercentage}%`)
      }),
      { numRuns: 100 }
    )
  })

  it('Property 1: color is green when score >= 0.7', () => {
    const highScoreArb = fc.double({ min: 0.7, max: 1, noNaN: true, noDefaultInfinity: true })

    fc.assert(
      fc.property(highScoreArb, (score) => {
        const tender = makeTenderWithScore(score)
        const { container } = renderComponent(tender)

        const scoreEl = container.querySelector('.text-2xl')
        expect(scoreEl).not.toBeNull()
        expect(scoreEl!.className).toContain('text-green')
      }),
      { numRuns: 100 }
    )
  })

  it('Property 1: color is yellow/amber when score in [0.4, 0.7)', () => {
    const midScoreArb = fc.double({ min: 0.4, max: 0.6999999999, noNaN: true, noDefaultInfinity: true })

    fc.assert(
      fc.property(midScoreArb, (score) => {
        const tender = makeTenderWithScore(score)
        const { container } = renderComponent(tender)

        const scoreEl = container.querySelector('.text-2xl')
        expect(scoreEl).not.toBeNull()
        expect(scoreEl!.className).toContain('text-yellow')
      }),
      { numRuns: 100 }
    )
  })

  it('Property 1: color is red when score < 0.4', () => {
    const lowScoreArb = fc.double({ min: 0, max: 0.3999999999, noNaN: true, noDefaultInfinity: true })

    fc.assert(
      fc.property(lowScoreArb, (score) => {
        const tender = makeTenderWithScore(score)
        const { container } = renderComponent(tender)

        const scoreEl = container.querySelector('.text-2xl')
        expect(scoreEl).not.toBeNull()
        expect(scoreEl!.className).toContain('text-red')
      }),
      { numRuns: 100 }
    )
  })
})
