import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { sortRunsByDate, sortTendersClientSide } from './sorting'
import type { RunItem, TenderListItem } from '@/api/types'

// Feature: rfp-web-v1, Property 5: Runs sorted by date descending after merge
// Feature: rfp-web-v1, Property 8: Client-side sort correctness

/** Arbitrary that generates a minimal RunItem with a random started_at date. */
const runListItemArb = fc.integer({
  min: new Date('2020-01-01').getTime(),
  max: new Date('2030-12-31').getTime(),
}).map(
  (ts): RunItem => ({
    pk: '',
    source_id: '',
    run_date: '',
    started_at: new Date(ts).toISOString(),
    completed_at: null,
    status: 'success',
    collector_result: null,
    retriever_result: null,
  }),
)

/** Arbitrary that generates a minimal TenderListItem with random budget and deadline. */
const tenderListItemArb = fc
  .record({
    budget: fc.integer({ min: 0, max: 10_000_000 }),
    deadline: fc.oneof(
      fc.integer({
        min: new Date('2020-01-01').getTime(),
        max: new Date('2030-12-31').getTime(),
      }).map((ts) => new Date(ts).toISOString().slice(0, 10)),
      fc.constant(null),
    ),
  })
  .map(
    ({ budget, deadline }): TenderListItem => ({
      source_id: 'src',
      tender_id: 'tid',
      title: 'Test',
      posted_date: '2024-01-01',
      deadline,
      discovered_at: '2024-01-01',
      status: 'completed',
      fully_visible: true,
      budget,
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
    }),
  )

describe('sorting property tests', () => {
  // Feature: rfp-web-v1, Property 5: Runs sorted by date descending after merge
  // **Validates: Requirements 4.3**
  it('Property 5: sorted runs have each started_at >= next element started_at', () => {
    fc.assert(
      fc.property(fc.array(runListItemArb, { maxLength: 50 }), (runs) => {
        const sorted = sortRunsByDate(runs)

        // Length preserved
        expect(sorted).toHaveLength(runs.length)

        // Descending order: each element's started_at >= next element's started_at
        for (let i = 0; i < sorted.length - 1; i++) {
          expect(sorted[i].started_at >= sorted[i + 1].started_at).toBe(true)
        }
      }),
      { numRuns: 100 },
    )
  })

  // Feature: rfp-web-v1, Property 8: Client-side sort correctness
  // **Validates: Requirements 6.8**
  it('Property 8: sorted tenders are ordered correctly with nulls last', () => {
    const fieldArb = fc.constantFrom('budget' as const, 'deadline' as const)
    const directionArb = fc.constantFrom('asc' as const, 'desc' as const)

    fc.assert(
      fc.property(
        fc.array(tenderListItemArb, { maxLength: 50 }),
        fieldArb,
        directionArb,
        (tenders, field, direction) => {
          const sorted = sortTendersClientSide(tenders, field, direction)

          // Length preserved
          expect(sorted).toHaveLength(tenders.length)

          // Null values must be at the end
          const firstNullIdx = sorted.findIndex((t) => t[field] === null)
          if (firstNullIdx !== -1) {
            for (let i = firstNullIdx; i < sorted.length; i++) {
              expect(sorted[i][field]).toBeNull()
            }
          }

          // Non-null values must be correctly ordered
          const nonNull = sorted.filter((t) => t[field] !== null)
          for (let i = 0; i < nonNull.length - 1; i++) {
            const a = nonNull[i][field]!
            const b = nonNull[i + 1][field]!
            if (direction === 'asc') {
              expect(a <= b).toBe(true)
            } else {
              expect(a >= b).toBe(true)
            }
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
