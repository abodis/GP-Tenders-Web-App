import { describe, it, expect } from 'vitest'
import { computeScoreFactors } from './scoring'

describe('computeScoreFactors', () => {
  it('computes all factors when all values are present', () => {
    const result = computeScoreFactors({
      interestingness_score: 8,
      relevance_score: 7,
      team_match_result: { team_match_score: 0.5 },
      reference_match_result: { reference_match_score: 0.8 },
      exclusion_result: { excluded: false },
    })

    expect(result.interestingness).toBeCloseTo(0.8)
    expect(result.eval_factor).toBeCloseTo(0.88)
    expect(result.team_factor).toBeCloseTo(0.85)
    expect(result.ref_factor).toBeCloseTo(0.94)
    expect(result.exclusion_factor).toBe(1.0)
  })

  it('returns null for any factor whose source value is null', () => {
    const result = computeScoreFactors({
      interestingness_score: null,
      relevance_score: null,
      team_match_result: null,
      reference_match_result: null,
      exclusion_result: null,
    })

    expect(result.interestingness).toBeNull()
    expect(result.eval_factor).toBeNull()
    expect(result.team_factor).toBeNull()
    expect(result.ref_factor).toBeNull()
    expect(result.exclusion_factor).toBeNull()
  })

  it('returns 0.0 exclusion_factor when excluded is true', () => {
    const result = computeScoreFactors({
      interestingness_score: null,
      relevance_score: null,
      team_match_result: null,
      reference_match_result: null,
      exclusion_result: { excluded: true },
    })

    expect(result.exclusion_factor).toBe(0.0)
  })

  it('handles mixed null and present values', () => {
    const result = computeScoreFactors({
      interestingness_score: 10,
      relevance_score: null,
      team_match_result: { team_match_score: 1.0 },
      reference_match_result: null,
      exclusion_result: { excluded: false },
    })

    expect(result.interestingness).toBeCloseTo(1.0)
    expect(result.eval_factor).toBeNull()
    expect(result.team_factor).toBeCloseTo(1.0)
    expect(result.ref_factor).toBeNull()
    expect(result.exclusion_factor).toBe(1.0)
  })
})
