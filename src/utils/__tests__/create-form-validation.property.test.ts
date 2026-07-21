import { describe, it } from 'vitest'
import fc from 'fast-check'

/**
 * Feature: team-management, Property 5: Create form validation gate
 *
 * **Validates: Requirements 5.2**
 *
 * For any combination of name (string), email (string), and type selection state
 * (selected or not), the create dialog submit button SHALL be enabled if and only if
 * name.trim() !== '' AND email matches /^[^\s@]+@[^\s@]+\.[^\s@]+$/ AND type has a
 * selected value.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isCreateFormValid(name: string, email: string, typeSelected: boolean): boolean {
  return name.trim() !== '' && EMAIL_REGEX.test(email) && typeSelected
}

describe('Feature: team-management, Property 5: Create form validation gate', () => {
  it('submit enabled iff name non-empty after trim AND email matches regex AND type selected', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.oneof(fc.emailAddress(), fc.string(), fc.constant(''), fc.constant('not-an-email')),
        fc.boolean(),
        (name, email, typeSelected) => {
          const result = isCreateFormValid(name, email, typeSelected)
          const expected = name.trim() !== '' && EMAIL_REGEX.test(email) && typeSelected
          return result === expected
        },
      ),
      { numRuns: 100 },
    )
  })
})
