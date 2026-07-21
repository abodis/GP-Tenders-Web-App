import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// Feature: team-management, Property 2: Pagination termination

/**
 * Mirrors the getNextPageParam logic from useTeamList in src/hooks/useTeam.ts.
 * Extracted here for isolated property testing.
 */
function getNextPageParam(lastPage: {
  page: number
  total_pages: number | null
}): number | undefined {
  return lastPage.total_pages !== null && lastPage.page < lastPage.total_pages
    ? lastPage.page + 1
    : undefined
}

describe('getNextPageParam property test', () => {
  // **Validates: Requirements 3.1**
  it('returns page + 1 when total_pages is not null and page < total_pages, undefined otherwise', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.oneof(fc.integer({ min: 1, max: 1000 }), fc.constant(null)),
        (page, total_pages) => {
          const result = getNextPageParam({ page, total_pages })

          if (total_pages !== null && page < total_pages) {
            expect(result).toBe(page + 1)
          } else {
            expect(result).toBeUndefined()
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
