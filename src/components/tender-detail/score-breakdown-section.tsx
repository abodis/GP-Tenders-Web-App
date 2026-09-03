import type { TenderDetailResponse } from '@/api/types'
import { computeScoreFactors } from '@/utils/scoring'
import { cn } from '@/lib/utils'

interface ScoreBreakdownSectionProps {
  tender: TenderDetailResponse
}

const FACTOR_CONFIG = [
  { key: 'interestingness', name: 'Interestingness', source: (t: TenderDetailResponse) => t.interestingness_score != null ? `${t.interestingness_score}/10` : null },
  { key: 'eval_factor', name: 'Evaluation', source: (t: TenderDetailResponse) => t.relevance_score != null ? `${t.relevance_score}` : null },
  { key: 'team_factor', name: 'Team Fit', source: (t: TenderDetailResponse) => t.team_match_result != null ? `${t.team_match_result.team_match_score.toFixed(2)}` : null },
  { key: 'ref_factor', name: 'References', source: (t: TenderDetailResponse) => t.reference_match_result != null ? `${t.reference_match_result.reference_match_score.toFixed(2)}` : null },
  { key: 'exclusion_factor', name: 'Exclusion', source: (t: TenderDetailResponse) => t.exclusion_result != null ? (t.exclusion_result.excluded ? 'Excluded' : 'Not excluded') : null },
] as const

export function ScoreBreakdownSection({ tender }: ScoreBreakdownSectionProps) {
  if (tender.unified_score == null) {
    return (
      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Unified Score</h2>
        <p className="text-sm text-muted-foreground">Score not computed yet</p>
      </section>
    )
  }

  const factors = computeScoreFactors(tender)

  return (
    <section>
      <h2 className="mb-1 text-sm font-semibold text-muted-foreground">Unified Score</h2>
      <p className="mb-4 text-2xl font-bold">{tender.unified_score.toFixed(2)}</p>

      <div className="space-y-3">
        {FACTOR_CONFIG.map(({ key, name, source }) => {
          const value = factors[key as keyof typeof factors]
          const sourceLabel = source(tender)
          const isExclusionZero = key === 'exclusion_factor' && value === 0

          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className={cn(
                  'font-medium',
                  value == null && 'text-muted-foreground',
                  isExclusionZero && 'text-red-600',
                )}>
                  {name}
                </span>
                <span className={cn(
                  'tabular-nums',
                  value == null && 'text-muted-foreground',
                  isExclusionZero && 'text-red-600',
                )}>
                  {value != null ? (
                    <>
                      <span className="mr-2 text-xs text-muted-foreground">{sourceLabel}</span>
                      {value.toFixed(2)}
                    </>
                  ) : (
                    'Pending'
                  )}
                </span>
              </div>
              <div className={cn(
                'h-2 w-full overflow-hidden rounded-full',
                value == null ? 'bg-muted/50' : 'bg-muted',
              )}>
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    value == null && 'w-0',
                    isExclusionZero && 'bg-red-500',
                    !isExclusionZero && value != null && 'bg-primary',
                  )}
                  style={value != null ? { width: `${Math.min(value, 1) * 100}%` } : undefined}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
