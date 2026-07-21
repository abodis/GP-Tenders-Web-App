import { describe, it } from 'vitest'
import fc from 'fast-check'
import { validateCvFile } from '@/utils/cv-validation'

/**
 * Feature: team-management, Property 3: Client-side CV file validation
 *
 * **Validates: Requirements 7.4**
 *
 * For any file with a given size (in bytes) and MIME type, the validation function
 * SHALL accept the file if and only if size ≤ 10,485,760 bytes AND MIME type is one of
 * `application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
 */
describe('Property 3: Client-side CV file validation', () => {
  const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]
  const MAX_SIZE = 10_485_760

  it('accepts file iff size ≤ 10MB AND MIME is PDF or DOCX', () => {
    const sizeArb = fc.integer({ min: 0, max: 20_000_000 })
    const mimeArb = fc.oneof(
      fc.constant('application/pdf'),
      fc.constant('application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      fc.string(),
      fc.constant('image/png'),
      fc.constant('text/plain'),
    )

    fc.assert(
      fc.property(sizeArb, mimeArb, (size, mime) => {
        const file = new File([''], 'test.pdf', { type: mime })
        Object.defineProperty(file, 'size', { value: size })

        const result = validateCvFile(file)

        const shouldBeValid = size <= MAX_SIZE && ALLOWED_MIME_TYPES.includes(mime)

        if (shouldBeValid) {
          return result === null
        } else {
          return typeof result === 'string' && result.length > 0
        }
      }),
      { numRuns: 100 },
    )
  })
})
