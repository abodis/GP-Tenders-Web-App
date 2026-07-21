import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { validateDocument } from '@/utils/document-validation'

/**
 * Feature: references-management
 *
 * Property tests for validateDocument utility.
 * **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6**
 */

const MAX_SIZE = 10_485_760
const VALID_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

function mockFile(size: number, type: string): File {
  const content = new Uint8Array(Math.min(size, 100))
  const file = new File([content], 'test.pdf', { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('Property tests for validateDocument', () => {
  // Feature: references-management, Property 1: Size-first error ordering
  it('Property 1: when both MIME and size are invalid, size error is returned', () => {
    const oversizeArb = fc.integer({ min: MAX_SIZE + 1, max: 100_000_000 })
    const invalidMimeArb = fc.oneof(
      fc.constant('image/png'),
      fc.constant('text/plain'),
      fc.constant('application/json'),
      fc.string().filter((s) => !VALID_MIMES.includes(s)),
    )

    fc.assert(
      fc.property(oversizeArb, invalidMimeArb, (size, mime) => {
        const file = mockFile(size, mime)
        const result = validateDocument(file)
        expect(result).toBe('File exceeds 10MB limit')
      }),
      { numRuns: 100 },
    )
  })

  // Feature: references-management, Property 2: Idempotence
  it('Property 2: validating twice yields the same result', () => {
    const sizeArb = fc.integer({ min: 0, max: MAX_SIZE })
    const mimeArb = fc.constantFrom(...VALID_MIMES)

    fc.assert(
      fc.property(sizeArb, mimeArb, (size, mime) => {
        const file = mockFile(size, mime)
        const first = validateDocument(file)
        const second = validateDocument(file)
        expect(first).toBe(null)
        expect(second).toBe(null)
        expect(first).toBe(second)
      }),
      { numRuns: 100 },
    )
  })

  // Feature: references-management, Property 3: Valid files always return null
  it('Property 3: accepted MIME + size ≤ 10MB → null', () => {
    const sizeArb = fc.integer({ min: 0, max: MAX_SIZE })
    const mimeArb = fc.constantFrom(...VALID_MIMES)

    fc.assert(
      fc.property(sizeArb, mimeArb, (size, mime) => {
        const file = mockFile(size, mime)
        const result = validateDocument(file)
        expect(result).toBe(null)
      }),
      { numRuns: 100 },
    )
  })

  // Feature: references-management, Property 4: Oversized files always return error
  it('Property 4: size > 10MB → non-empty string regardless of MIME', () => {
    const oversizeArb = fc.integer({ min: MAX_SIZE + 1, max: 100_000_000 })
    const anyMimeArb = fc.oneof(
      fc.constantFrom(...VALID_MIMES),
      fc.constant('image/png'),
      fc.constant('text/plain'),
      fc.string(),
    )

    fc.assert(
      fc.property(oversizeArb, anyMimeArb, (size, mime) => {
        const file = mockFile(size, mime)
        const result = validateDocument(file)
        expect(result).toBeTypeOf('string')
        expect((result as string).length).toBeGreaterThan(0)
      }),
      { numRuns: 100 },
    )
  })

  // Feature: references-management, Property 5: Invalid MIME types return error
  it('Property 5: size ≤ 10MB + wrong MIME → non-empty string', () => {
    const sizeArb = fc.integer({ min: 0, max: MAX_SIZE })
    const invalidMimeArb = fc.oneof(
      fc.constant('image/png'),
      fc.constant('text/plain'),
      fc.constant('application/json'),
      fc.constant('image/jpeg'),
      fc.string().filter((s) => !VALID_MIMES.includes(s)),
    )

    fc.assert(
      fc.property(sizeArb, invalidMimeArb, (size, mime) => {
        const file = mockFile(size, mime)
        const result = validateDocument(file)
        expect(result).toBeTypeOf('string')
        expect((result as string).length).toBeGreaterThan(0)
      }),
      { numRuns: 100 },
    )
  })
})
