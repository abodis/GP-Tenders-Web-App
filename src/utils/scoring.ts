export interface ScoreFactors {
  interestingness: number | null // from interestingness_score / 10
  eval_factor: number | null // 0.6 + (relevance_score / 10) × 0.4
  team_factor: number | null // 0.7 + team_match_score × 0.3
  ref_factor: number | null // 0.7 + reference_match_score × 0.3
  exclusion_factor: number | null // 0.0 if excluded, 1.0 otherwise
}

export function computeScoreFactors(tender: {
  interestingness_score: number | null
  relevance_score: number | null
  team_match_result: { team_match_score: number } | null
  reference_match_result: { reference_match_score: number } | null
  exclusion_result: { excluded: boolean } | null
}): ScoreFactors {
  return {
    interestingness:
      tender.interestingness_score != null
        ? tender.interestingness_score / 10
        : null,
    eval_factor:
      tender.relevance_score != null
        ? 0.6 + (tender.relevance_score / 10) * 0.4
        : null,
    team_factor:
      tender.team_match_result != null
        ? 0.7 + tender.team_match_result.team_match_score * 0.3
        : null,
    ref_factor:
      tender.reference_match_result != null
        ? 0.7 + tender.reference_match_result.reference_match_score * 0.3
        : null,
    exclusion_factor:
      tender.exclusion_result != null
        ? tender.exclusion_result.excluded
          ? 0.0
          : 1.0
        : null,
  }
}
