import type { TenderDetailResponse } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { InfoTooltip } from '@/components/InfoTooltip'
import { cn } from '@/lib/utils'

interface TeamTabProps {
  tender: TenderDetailResponse
  state: 'fully_analyzed' | 'legacy_analyzed'
}

function statusColor(status: 'matched' | 'partial' | 'gap'): string {
  switch (status) {
    case 'matched':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'partial':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'gap':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children ?? '—'}</dd>
    </div>
  )
}

export function TeamTab({ tender, state }: TeamTabProps) {
  if (state === 'fully_analyzed') {
    const teamReqs = tender.team_requirements
    const matchResult = tender.team_match_result

    if (!teamReqs) {
      return <p className="text-sm text-muted-foreground">No team data has been extracted</p>
    }

    const requirements = teamReqs.team_requirements
    // Build a lookup from role_matches by required_role
    const matchMap = new Map(
      matchResult?.role_matches.map((rm) => [rm.required_role, rm]) ?? []
    )

    if (requirements.length === 0) {
      return <p className="text-sm text-muted-foreground">No team data has been extracted</p>
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{teamReqs.extraction_confidence} confidence</Badge>
          <span className="text-sm text-muted-foreground">
            Total experts: {teamReqs.total_experts_required ?? '—'}
          </span>
          {matchResult && (
            <span className={cn('text-sm font-medium', matchResult.team_match_score >= 0.7 ? 'text-green-600' : matchResult.team_match_score >= 0.4 ? 'text-yellow-600' : 'text-red-600')}>
              Match: {Math.round(matchResult.team_match_score * 100)}%
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Role</th>
                <th className="pb-2 pr-4 font-medium">Specializations</th>
                <th className="pb-2 pr-4 font-medium">Mandatory</th>
                <th className="pb-2 pr-4 font-medium">Min Years</th>
                <th className="pb-2 pr-4 font-medium">Languages</th>
                {matchResult && <th className="pb-2 pr-4 font-medium">Status</th>}
                {matchResult && <th className="pb-2 pr-4 font-medium">Best Match</th>}
                {matchResult && <th className="pb-2 font-medium">Score</th>}
              </tr>
            </thead>
            <tbody>
              {requirements.map((req, idx) => {
                const match = matchMap.get(req.role)
                return (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="py-2 pr-4">{req.role}</td>
                    <td className="py-2 pr-4">
                      {req.specializations.length > 0 ? req.specializations.join(', ') : '—'}
                    </td>
                    <td className="py-2 pr-4">{req.mandatory ? 'Yes' : 'No'}</td>
                    <td className="py-2 pr-4">{req.min_years ?? '—'}</td>
                    <td className="py-2 pr-4">
                      {req.languages.length > 0 ? req.languages.join(', ') : '—'}
                    </td>
                    {matchResult && (
                      <td className="py-2 pr-4">
                        {match ? (
                          <Badge className={statusColor(match.status)}>{match.status}</Badge>
                        ) : '—'}
                      </td>
                    )}
                    {matchResult && (
                      <td className="py-2 pr-4">
                        {match?.best_match?.name ?? '—'}
                      </td>
                    )}
                    {matchResult && (
                      <td className="py-2">
                        {match ? `${Math.round(match.match_score * 100)}%` : '—'}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // legacy_analyzed
  const experts = tender.experts_required
  if (!experts) {
    return <p className="text-sm text-muted-foreground">No team data has been extracted</p>
  }

  return (
    <div className="space-y-2">
      {experts.notes ? (
        <>
          <p className="text-sm">{experts.notes}</p>
          <InfoTooltip>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-sm">
              <Field label="International">{experts.international}</Field>
              <Field label="Local">{experts.local}</Field>
              <Field label="Key Experts">{experts.key_experts}</Field>
              <Field label="Total">{experts.total}</Field>
            </dl>
          </InfoTooltip>
        </>
      ) : (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-sm">
          <Field label="International">{experts.international}</Field>
          <Field label="Local">{experts.local}</Field>
          <Field label="Key Experts">{experts.key_experts}</Field>
          <Field label="Total">{experts.total}</Field>
        </dl>
      )}
    </div>
  )
}
