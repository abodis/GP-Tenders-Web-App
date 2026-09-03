import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { humanizeTenderType } from './format'

/**
 * **Validates: Requirements 6.5, 10.4**
 *
 * Property 5: Tender type humanization produces no underscores
 * and title-cases each word.
 */
describe('humanizeTenderType – Property 5', () => {
  it('returns null for null input', () => {
    expect(humanizeTenderType(null)).toBeNull()
  })

  it('output contains no underscores and each word starts uppercase', () => {
    // Generate strings that simulate realistic tender type values:
    // words composed of lowercase letters joined by underscores
    const wordArb = fc
      .array(fc.integer({ min: 97, max: 122 }).map((n) => String.fromCharCode(n)), {
        minLength: 1,
        maxLength: 8,
      })
      .map((chars) => chars.join(''))
    const tenderTypeArb = fc
      .array(wordArb, { minLength: 1, maxLength: 5 })
      .map((parts) => parts.join('_'))

    fc.assert(
      fc.property(tenderTypeArb, (input) => {
        const result = humanizeTenderType(input)

        // Non-null input always produces non-null output
        expect(result).not.toBeNull()

        // No underscores in output
        expect(result).not.toContain('_')

        // Each space-separated word starts with an uppercase letter
        const words = result!.split(' ').filter((w) => w.length > 0)
        for (const word of words) {
          expect(word[0]).toBe(word[0].toUpperCase())
        }
      }),
      { numRuns: 100 },
    )
  })
})
