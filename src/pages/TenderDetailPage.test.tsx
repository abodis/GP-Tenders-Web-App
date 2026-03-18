import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TenderDetailPage from './TenderDetailPage'
import type { TenderDetailResponse } from '@/api/types'

// Feature: rfp-web-v1, Property 12: All warnings rendered
// **Validates: Requirements 7.12**

vi.mock('@/hooks/useTenderDetail')
vi.mock('@/hooks/useTenderDocuments')

import { useTenderDetail } from '@/hooks/useTenderDetail'
import { useTenderDocuments } from '@/hooks/useTenderDocuments'

function buildMockTender(warnings: string[]): TenderDetailResponse {
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
    warnings,
    analysis_context: null,
    analysis_model: null,
    emailed_at: null,
    experts_required: null,
    references_required: null,
    turnover_required: null,
  }
}

function renderTenderDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/tenders/test-source/test-tender']}>
        <Routes>
          <Route path="tenders/:sourceId/:tenderId" element={<TenderDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/**
 * Generate unique warning strings: alphanumeric words separated by single spaces.
 * Avoids special chars that collide with DOM content and multi-space sequences
 * that get collapsed by HTML rendering.
 */
const warningWordArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{0,11}$/)

const warningStringArb = fc
  .array(warningWordArb, { minLength: 1, maxLength: 6 })
  .map((words) => words.join(' '))

const warningsArb = fc.uniqueArray(warningStringArb, { minLength: 1, maxLength: 10 })

beforeEach(() => {
  vi.mocked(useTenderDocuments).mockReturnValue({
    data: { items: [], count: 0, next_cursor: null },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    refreshIfExpired: vi.fn(),
    fetchTimestamp: { current: 0 },
  } as unknown as ReturnType<typeof useTenderDocuments>)
})

describe('TenderDetailPage property tests', () => {
  // Feature: rfp-web-v1, Property 12: All warnings rendered
  // **Validates: Requirements 7.12**
  it('Property 12: every warning string appears in the rendered output', () => {
    fc.assert(
      fc.property(warningsArb, (warnings) => {
        const tender = buildMockTender(warnings)

        vi.mocked(useTenderDetail).mockReturnValue({
          data: tender,
          isLoading: false,
          isError: false,
          error: null,
          refetch: vi.fn(),
        } as unknown as ReturnType<typeof useTenderDetail>)

        const { unmount } = renderTenderDetail()

        for (const warning of warnings) {
          const matches = screen.getAllByText(warning)
          expect(matches.length).toBeGreaterThanOrEqual(1)
        }

        unmount()
      }),
      { numRuns: 100 },
    )
  })
})
