import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { getScoreBadgeColor, formatBudget } from './formatting'

// Feature: rfp-web-v1, Property 9: Score badge color mapping
// Feature: rfp-web-v1, Property 10: Budget formatting

describe('formatting property tests', () => {
  // Feature: rfp-web-v1, Property 9: Score badge color mapping
  // **Validates: Requirements 6.9, 6.15**
  it('Property 9: returns correct color variant for any score 0-10 or null', () => {
    const scoreArb = fc.oneof(
      fc.integer({ min: 0, max: 10 }),
      fc.constant(null),
    )

    fc.assert(
      fc.property(scoreArb, (score) => {
        const result = getScoreBadgeColor(score)

        if (score === null) {
          expect(result.color).toBe('gray')
          expect(result.label).toBe('N/A')
        } else if (score === 0) {
          expect(result.color).toBe('gray')
          expect(result.label).toBe('Filtered')
        } else if (score >= 1 && score <= 3) {
          expect(result.color).toBe('red')
          expect(result.label).toBe(String(score))
        } else if (score >= 4 && score <= 6) {
          expect(result.color).toBe('yellow')
          expect(result.label).toBe(String(score))
        } else {
          // 7-10
          expect(result.color).toBe('green')
          expect(result.label).toBe(String(score))
        }
      }),
      { numRuns: 100 },
    )
  })

  // Feature: rfp-web-v1, Property 10: Budget formatting
  // **Validates: Requirements 6.10, 7.3**
  it('Property 10: returns "Not specified" for 0 and EUR-formatted string for positive values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000_000 }),
        (budget) => {
          const result = formatBudget(budget)

          if (budget === 0) {
            expect(result).toBe('Not specified')
          } else {
            expect(result).toContain('€')
            expect(result).not.toBe('Not specified')
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
