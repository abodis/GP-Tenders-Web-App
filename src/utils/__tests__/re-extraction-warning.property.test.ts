import { describe, it } from 'vitest'
import fc from 'fast-check'
import { shouldShowReExtractionWarning } from '@/utils/re-extraction-warning'

describe('Feature: team-management, Property 4: Re-extraction warning visibility predicate', () => {
  /**
   * **Validates: Requirements 10.1, 10.2, 10.3**
   *
   * For any combination of cv_s3_key (string or null) and notes field state
   * (current value vs. last-saved value), the re-extraction warning SHALL be
   * visible if and only if cv_s3_key is not null AND the current notes value
   * differs from the last-saved notes value.
   */
  it('warning is visible iff cv_s3_key is not null AND currentNotes !== savedNotes', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string({ minLength: 1 }), fc.constant(null)),
        fc.string(),
        fc.string(),
        (cvS3Key, currentNotes, savedNotes) => {
          const result = shouldShowReExtractionWarning(cvS3Key, currentNotes, savedNotes)

          if (cvS3Key !== null && currentNotes !== savedNotes) {
            return result === true
          }
          return result === false
        },
      ),
      { numRuns: 100 },
    )
  })
})
