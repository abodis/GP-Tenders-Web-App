import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { render } from '@testing-library/react'
import { ExclusionBanner } from './exclusion-banner'
import type { ExclusionResult, ExclusionCategory } from '@/api/types'

// Feature: tender-detail-overhaul, Property 6: Exclusion banner displays all reasons when excluded
describe('ExclusionBanner property tests', () => {
  // **Validates: Requirements 6.1**

  const exclusionCategoryArb: fc.Arbitrary<ExclusionCategory> = fc.constantFrom(
    'financial', 'legal', 'experience', 'accreditation', 'geographic', 'consortium', 'capacity'
  )

  const confidenceArb = fc.constantFrom('high' as const, 'medium' as const, 'low' as const)

  const exclusionCriterionArb = fc.record({
    criterion: fc.string({ minLength: 1, maxLength: 50 }),
    category: exclusionCategoryArb,
    assessment: fc.constantFrom('pass' as const, 'fail' as const, 'uncertain' as const),
    confidence: confidenceArb,
    reason: fc.string({ minLength: 1, maxLength: 100 }),
  })

  const exclusionResultArb: fc.Arbitrary<ExclusionResult> = fc.record({
    criteria: fc.array(exclusionCriterionArb, { minLength: 0, maxLength: 5 }),
    excluded: fc.constant(true),
    exclusion_reasons: fc.array(fc.string({ minLength: 1, maxLength: 80 }), { minLength: 1, maxLength: 5 }),
    uncertain_flags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 3 }),
    extraction_confidence: confidenceArb,
  })

  it('Property 6: all exclusion reasons appear in rendered output', () => {
    fc.assert(
      fc.property(exclusionResultArb, (exclusionResult) => {
        const { container } = render(
          <ExclusionBanner exclusionResult={exclusionResult} />
        )

        const content = container.textContent ?? ''

        for (const reason of exclusionResult.exclusion_reasons) {
          expect(content).toContain(reason)
        }
      }),
      { numRuns: 100 }
    )
  })
})
