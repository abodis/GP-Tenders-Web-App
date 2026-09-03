import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import type { TenderDetailResponse } from '@/api/types'
import { useTenderActions } from '@/hooks/useTenderActions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TeamMatchSectionProps {
  tender: TenderDetailResponse
  sourceId: string
  tenderId: string
}

function scoreColor(score: number): string {
  if (score >= 0.7) return 'text-green-600 dark:text-green-400'
  if (score >= 0.4) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

function progressColor(score: number): string {
  if (score >= 0.7) return 'bg-green-500'
  if (score >= 0.4) return 'bg-yellow-500'
  return 'bg-red-500'
}

export function TeamMatchSection({ tender, sourceId, tenderId }: TeamMatchSectionProps) {
  const { teamMatch } = useTenderActions(sourceId, tenderId)
  const [error, setError] = useState<string | null>(null)

  const teamReqs = tender.team_requirements
  const matchResult = tender.team_match_result

  // Section not relevant when no team requirements
  if (teamReqs === null) return null

  // Requirements exist but no match yet → show Run button
  if (matchResult === null) {
    return (
      <section>
        <h2 className="mb-3 text-lg font-semibold">Team Match</h2>
        <div className="space-y-2">
          <Button
            variant="outline"
            disabled={teamMatch.isPending}
            onClick={() => {
              setError(null)
              teamMatch.mutate(undefined, {
                onError: (err) => {
                  setError(err instanceof Error ? err.message : 'Team match failed')
                },
              })
            }}
          >
            {teamMatch.isPending && <Loader2 className="size-4 animate-spin" />}
            Run Team Match
          </Button>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
      </section>
    )
  }

  const score = matchResult.team_match_score
  const percentage = Math.round(score * 100)

  // Match result exists but empty role_matches
  if (matchResult.role_matches.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-lg font-semibold">Team Match</h2>
        <div className="mb-3 flex items-center gap-3">
          <span className={cn('text-2xl font-bold', scoreColor(score))}>{percentage}%</span>
          <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
            <div className={cn('h-full rounded-full', progressColor(score))} style={{ width: `${percentage}%` }} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">No role matches to display.</p>
      </section>
    )
  }

  // Full display
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Team Match</h2>

      {/* Overall score */}
      <div className="mb-4 flex items-center gap-3">
        <span className={cn('text-2xl font-bold', scoreColor(score))}>{percentage}%</span>
        <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
          <div className={cn('h-full rounded-full', progressColor(score))} style={{ width: `${percentage}%` }} />
        </div>
      </div>

      {/* Role matches table */}
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Role</th>
              <th className="pb-2 pr-4 font-medium">Mandatory</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 pr-4 font-medium">Best Match</th>
              <th className="pb-2 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {matchResult.role_matches.map((rm, idx) => (
              <tr key={idx} className="border-b last:border-0">
                <td className="py-2 pr-4">{rm.required_role}</td>
                <td className="py-2 pr-4">{rm.mandatory ? 'Yes' : 'No'}</td>
                <td className="py-2 pr-4 capitalize">{rm.status}</td>
                <td className="py-2 pr-4">
                  {rm.best_match ? (
                    <Link to={`/team/${rm.best_match.id}`} className="text-primary hover:underline">
                      {rm.best_match.name}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="py-2">{Math.round(rm.match_score * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Gap summary */}
      {matchResult.gaps.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Gaps</h3>
          <ul className="space-y-1">
            {matchResult.gaps.map((gap, idx) => (
              <li
                key={idx}
                className={cn(
                  'text-sm rounded px-2 py-1',
                  gap.severity === 'high'
                    ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                    : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300'
                )}
              >
                {gap.role} — {gap.mandatory ? 'Mandatory' : 'Optional'} ({gap.severity} severity)
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
