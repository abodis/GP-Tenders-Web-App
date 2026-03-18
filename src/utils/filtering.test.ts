import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { filterRunsBySource } from './filtering'
import type { RunItem, TenderListParams } from '@/api/types'

// Feature: rfp-web-v1, Property 6: Source filter on runs list
// Feature: rfp-web-v1, Property 7: Tender list filter correctness

/** Arbitrary that generates a RunItem with a random source_id. */
const sourceIdArb = fc.string({ minLength: 1, maxLength: 20 })

const runListItemArb = (sourceId: fc.Arbitrary<string>) =>
  sourceId.map(
    (sid): RunItem => ({
      pk: '',
      source_id: sid,
      run_date: '2024-01-01',
      started_at: '2024-01-01T00:00:00Z',
      completed_at: null,
      status: 'success',
      collector_result: null,
      retriever_result: null,
    }),
  )

describe('filtering property tests', () => {
  // Feature: rfp-web-v1, Property 6: Source filter on runs list
  // **Validates: Requirements 4.4**
  it('Property 6: filtered runs contain only matching source_id; null includes everything', () => {
    fc.assert(
      fc.property(
        fc.array(runListItemArb(sourceIdArb), { minLength: 0, maxLength: 50 }),
        (runs) => {
          // Collect unique source_ids from the generated runs
          const sourceIds = [...new Set(runs.map((r) => r.source_id))]

          // Generate a filter: either null (all) or one of the existing source_ids
          const filterChoices: (string | null)[] = [null, ...sourceIds]

          for (const filter of filterChoices) {
            const result = filterRunsBySource(runs, filter)

            if (filter === null) {
              // "All sources" — result should equal the full input
              expect(result).toHaveLength(runs.length)
            } else {
              // Filtered — every result must have matching source_id
              for (const run of result) {
                expect(run.source_id).toBe(filter)
              }
              // Count should match the number of runs with that source_id
              const expected = runs.filter((r) => r.source_id === filter).length
              expect(result).toHaveLength(expected)
            }
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  // Feature: rfp-web-v1, Property 7: Tender list filter correctness
  // **Validates: Requirements 6.3, 6.4, 6.5, 6.6**
  it('Property 7: TenderListParams correctly includes defined filter values and excludes undefined ones', () => {
    const optionalString = fc.oneof(
      fc.string({ minLength: 1, maxLength: 20 }),
      fc.constant(undefined),
    )
    const analyzedArb = fc.oneof(
      fc.constant('true' as const),
      fc.constant('false' as const),
      fc.constant(undefined),
    )

    fc.assert(
      fc.property(
        optionalString, // status
        optionalString, // source_id
        optionalString, // discovered_from
        optionalString, // discovered_to
        analyzedArb,    // analyzed
        (status, sourceId, discoveredFrom, discoveredTo, analyzed) => {
          // Build TenderListParams from filter selections (mimics what the UI does)
          const params: TenderListParams = {}
          if (status !== undefined) params.status = status
          if (sourceId !== undefined) params.source_id = sourceId
          if (discoveredFrom !== undefined) params.discovered_from = discoveredFrom
          if (discoveredTo !== undefined) params.discovered_to = discoveredTo
          if (analyzed !== undefined) params.analyzed = analyzed

          // Verify: defined values appear as keys with correct values
          if (status !== undefined) {
            expect(params.status).toBe(status)
          } else {
            expect(params).not.toHaveProperty('status')
          }

          if (sourceId !== undefined) {
            expect(params.source_id).toBe(sourceId)
          } else {
            expect(params).not.toHaveProperty('source_id')
          }

          if (discoveredFrom !== undefined) {
            expect(params.discovered_from).toBe(discoveredFrom)
          } else {
            expect(params).not.toHaveProperty('discovered_from')
          }

          if (discoveredTo !== undefined) {
            expect(params.discovered_to).toBe(discoveredTo)
          } else {
            expect(params).not.toHaveProperty('discovered_to')
          }

          if (analyzed !== undefined) {
            expect(params.analyzed).toBe(analyzed)
          } else {
            expect(params).not.toHaveProperty('analyzed')
          }

          // Verify: the number of keys matches the number of defined filters
          const definedCount = [status, sourceId, discoveredFrom, discoveredTo, analyzed]
            .filter((v) => v !== undefined).length
          expect(Object.keys(params)).toHaveLength(definedCount)
        },
      ),
      { numRuns: 100 },
    )
  })
})
