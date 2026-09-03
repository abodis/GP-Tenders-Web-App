import { useState, useEffect } from 'react'
import type { TenderDetailResponse, RequirementMatch, ReferenceGapEntry } from '@/api/types'
import { useTenderActions } from '@/hooks/useTenderActions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

interface ReferenceMatchSectionProps {
  tender: TenderDetailResponse
  sourceId: string
  tenderId: string
}

function scoreColor(score: number): string {
  if (score >= 0.7) return 'text-green-600 dark:text-green-400'
  if (score >= 0.4) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function scoreBarColor(score: number): string {
  if (score >= 0.7) return 'bg-green-500'
  if (score >= 0.4) return 'bg-amber-500'
  return 'bg-red-500'
}

function severityColor(severity: 'high' | 'low'): string {
  return severity === 'high'
    ? 'text-red-600 dark:text-red-400'
    : 'text-amber-600 dark:text-amber-400'
}

interface ToastState {
  message: string
}

function ErrorToast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-lg">
      {toast.message}
    </div>
  )
}

function RequirementMatchRow({ match }: { match: RequirementMatch }) {
  const topMatches = [...match.best_matches]
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 3)

  return (
    <div className="border-b py-3 last:border-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-medium">{match.domain}</span>
        <Badge variant={match.mandatory ? 'default' : 'secondary'}>
          {match.mandatory ? 'Mandatory' : 'Optional'}
        </Badge>
        <Badge variant="outline">{match.status}</Badge>
        <span className="text-sm text-muted-foreground">
          Coverage: {match.coverage_count}
        </span>
      </div>
      {topMatches.length > 0 && (
        <div className="ml-4 text-sm text-muted-foreground">
          {topMatches.map((m, i) => (
            <span key={m.id}>
              {i > 0 && ', '}
              {m.title} ({Math.round(m.match_score * 100)}%)
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function GapSummary({ gaps }: { gaps: ReferenceGapEntry[] }) {
  if (gaps.length === 0) return null

  return (
    <div className="mt-3">
      <h4 className="text-sm font-medium mb-2">Gaps</h4>
      <div className="space-y-1">
        {gaps.map((gap, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className={severityColor(gap.severity)}>
              {gap.severity === 'high' ? '●' : '○'}
            </span>
            <span>{gap.domain}</span>
            <Badge variant={gap.mandatory ? 'default' : 'secondary'} className="text-xs">
              {gap.mandatory ? 'Mandatory' : 'Optional'}
            </Badge>
            <span className={`text-xs ${severityColor(gap.severity)}`}>
              {gap.severity} severity
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ReferenceMatchSection({ tender, sourceId, tenderId }: ReferenceMatchSectionProps) {
  const { referenceMatch } = useTenderActions(sourceId, tenderId)
  const [error, setError] = useState<ToastState | null>(null)

  const refReqs = tender.reference_requirements
  const matchResult = tender.reference_match_result

  // State 1: reference_requirements null → render nothing
  if (refReqs === null) return null

  // State 2: reference_requirements exists but reference_match_result null → show run button
  if (matchResult === null) {
    return (
      <section>
        <h2 className="mb-3 text-lg font-semibold">Reference Match</h2>
        <Button
          variant="outline"
          disabled={referenceMatch.isPending}
          onClick={() =>
            referenceMatch.mutate(undefined, {
              onError: (err) => setError({ message: (err as Error).message || 'Reference match failed' }),
            })
          }
        >
          {referenceMatch.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Run Reference Match
        </Button>
        {error && <ErrorToast toast={error} onDismiss={() => setError(null)} />}
      </section>
    )
  }

  const score = matchResult.reference_match_score
  const percentage = Math.round(score * 100)

  // State 3 & 4: match result exists
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Reference Match</h2>

      {/* Score display */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-bold ${scoreColor(score)}`}>
            {percentage}%
          </span>
          <div className="flex-1 max-w-xs">
            <div className="h-2 rounded-full bg-muted">
              <div
                className={`h-2 rounded-full ${scoreBarColor(score)}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* State 3: empty requirement_matches */}
      {matchResult.requirement_matches.length === 0 ? (
        <p className="text-sm text-muted-foreground">No requirement matches were found.</p>
      ) : (
        /* State 4: full display */
        <div>
          {matchResult.requirement_matches.map((match, i) => (
            <RequirementMatchRow key={i} match={match} />
          ))}
        </div>
      )}

      {/* Gap summary */}
      <GapSummary gaps={matchResult.gaps} />

      {error && <ErrorToast toast={error} onDismiss={() => setError(null)} />}
    </section>
  )
}
