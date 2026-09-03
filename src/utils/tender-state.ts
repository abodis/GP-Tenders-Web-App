import type { TenderDetailResponse } from '@/api/types'

export type TenderState = 'skipped' | 'unanalyzed' | 'legacy_analyzed' | 'fully_analyzed'

/**
 * Classifies a tender into one of four lifecycle states.
 * Precedence: skipped > fully_analyzed > legacy_analyzed > unanalyzed
 */
export function classifyTenderState(tender: TenderDetailResponse): TenderState {
  if (tender.skip_reason != null) return 'skipped'
  if (tender.team_requirements != null || tender.reference_requirements != null || tender.exclusion_result != null) return 'fully_analyzed'
  if (tender.experts_required != null || tender.references_required != null || tender.turnover_required != null) return 'legacy_analyzed'
  return 'unanalyzed'
}

/**
 * Returns badge color based on unified score value.
 * green ≥ 7.0, yellow ≥ 4.0, red > 0, gray for null/0
 */
export function getScoreBadgeColor(score: number | null): 'green' | 'yellow' | 'red' | 'gray' {
  if (score == null || score === 0) return 'gray'
  if (score >= 7.0) return 'green'
  if (score >= 4.0) return 'yellow'
  return 'red'
}

/**
 * Returns factor bar color based on 0–1 score.
 * green ≥ 0.7, yellow ≥ 0.4, red < 0.4
 */
export function getFactorBarColor(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 0.7) return 'green'
  if (score >= 0.4) return 'yellow'
  return 'red'
}
