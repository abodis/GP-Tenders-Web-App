import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { computeScoreFactors } from './scoring'

// Feature: tender-detail-overhaul, Property 8: Unified score factor computation correctness
describe('computeScoreFactors property tests', () => {
  // **Validates: Requirements 7.6**

  const nullableInt = (min: number, max: number) =>
    fc.oneof(fc.integer({ min, max }), fc.constant(null))

  const nullableFloat = (min: number, max: number) =>
    fc.oneof(fc.double({ min, max, noNaN: true, noDefaultInfinity: true }), fc.constant(null))

  const nullableBool = fc.oneof(fc.boolean(), fc.constant(null))

  it('Property 8: each factor matches formula or is null when source is null', () => {
    fc.assert(
      fc.property(
        nullableInt(0, 10),
        nullableInt(0, 10),
        nullableFloat(0, 1),
        nullableFloat(0, 1),
        nullableBool,
        (interestingness_score, relevance_score, team_match_score, ref_match_score, excluded) => {
          const tender = {
            interestingness_score,
            relevance_score,
            team_match_result: team_match_score != null ? { team_match_score } : null,
            reference_match_result: ref_match_score != null ? { reference_match_score: ref_match_score } : null,
            exclusion_result: excluded != null ? { excluded } : null,
          }

          const result = computeScoreFactors(tender)

          // interestingness
          if (interestingness_score == null) {
            expect(result.interestingness).toBeNull()
          } else {
            expect(result.interestingness).toBeCloseTo(interestingness_score / 10)
          }

          // eval_factor
          if (relevance_score == null) {
            expect(result.eval_factor).toBeNull()
          } else {
            expect(result.eval_factor).toBeCloseTo(0.6 + (relevance_score / 10) * 0.4)
          }

          // team_factor
          if (team_match_score == null) {
            expect(result.team_factor).toBeNull()
          } else {
            expect(result.team_factor).toBeCloseTo(0.7 + team_match_score * 0.3)
          }

          // ref_factor
          if (ref_match_score == null) {
            expect(result.ref_factor).toBeNull()
          } else {
            expect(result.ref_factor).toBeCloseTo(0.7 + ref_match_score * 0.3)
          }

          // exclusion_factor
          if (excluded == null) {
            expect(result.exclusion_factor).toBeNull()
          } else {
            expect(result.exclusion_factor).toBe(excluded ? 0.0 : 1.0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
