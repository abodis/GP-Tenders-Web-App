import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { isPresignedUrlExpired } from '@/utils/expiry'

// Feature: rfp-web-v1, Property 11: Presigned URL expiry detection

const FIFTY_MINUTES_MS = 50 * 60 * 1000

describe('expiry property tests', () => {
  // Feature: rfp-web-v1, Property 11: Presigned URL expiry detection
  // **Validates: Requirements 7.10**
  it('Property 11: returns true when elapsed > 50 minutes, false otherwise', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER - 1 }),
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER - 1 }),
        (a, b) => {
          const fetchTimestamp = Math.min(a, b)
          const now = Math.max(a, b)
          const elapsed = now - fetchTimestamp

          const result = isPresignedUrlExpired(fetchTimestamp, now)

          if (elapsed > FIFTY_MINUTES_MS) {
            expect(result).toBe(true)
          } else {
            expect(result).toBe(false)
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
