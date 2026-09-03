import type { TenderDetailResponse } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { InfoTooltip } from '@/components/InfoTooltip'
import { formatEur } from '@/utils/formatting'
import { cn } from '@/lib/utils'

interface ReferencesTabProps {
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

export function ReferencesTab({ tender, state }: ReferencesTabProps) {
  if (state === 'fully_analyzed') {
    const refReqs = tender.reference_requirements
    const matchResult = tender.reference_match_result

    if (!refReqs) {
      return <p className="text-sm text-muted-foreground">No reference data has been extracted</p>
    }

    const requirements = refReqs.reference_requirements
    // Build lookup from requirement_matches by domain
    const matchMap = new Map(
      matchResult?.requirement_matches.map((rm) => [rm.domain, rm]) ?? []
    )

    if (requirements.length === 0) {
      return <p className="text-sm text-muted-foreground">No reference data has been extracted</p>
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{refReqs.extraction_confidence} confidence</Badge>
          <span className="text-sm text-muted-foreground">
            Total required: {refReqs.total_references_required ?? '—'}
          </span>
          {matchResult && (
            <span className={cn('text-sm font-medium', matchResult.reference_match_score >= 0.7 ? 'text-green-600' : matchResult.reference_match_score >= 0.4 ? 'text-yellow-600' : 'text-red-600')}>
              Match: {Math.round(matchResult.reference_match_score * 100)}%
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Domain</th>
                <th className="pb-2 pr-4 font-medium">Mandatory</th>
                <th className="pb-2 pr-4 font-medium">Min Projects</th>
                <th className="pb-2 pr-4 font-medium">Min Value (EUR)</th>
                <th className="pb-2 pr-4 font-medium">Max Age (yrs)</th>
                <th className="pb-2 pr-4 font-medium">Region</th>
                {matchResult && <th className="pb-2 pr-4 font-medium">Status</th>}
                {matchResult && <th className="pb-2 pr-4 font-medium">Coverage</th>}
                {matchResult && <th className="pb-2 font-medium">Best Matches</th>}
              </tr>
            </thead>
            <tbody>
              {requirements.map((req, idx) => {
                const match = matchMap.get(req.domain)
                return (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="py-2 pr-4">{req.domain}</td>
                    <td className="py-2 pr-4">{req.mandatory ? 'Yes' : 'No'}</td>
                    <td className="py-2 pr-4">{req.min_projects ?? '—'}</td>
                    <td className="py-2 pr-4">{req.min_value_eur != null ? formatEur(req.min_value_eur) : '—'}</td>
                    <td className="py-2 pr-4">{req.max_age_years ?? '—'}</td>
                    <td className="py-2 pr-4">{req.region ?? '—'}</td>
                    {matchResult && (
                      <td className="py-2 pr-4">
                        {match ? (
                          <Badge className={statusColor(match.status)}>{match.status}</Badge>
                        ) : '—'}
                      </td>
                    )}
                    {matchResult && (
                      <td className="py-2 pr-4">
                        {match?.coverage_count ?? '—'}
                      </td>
                    )}
                    {matchResult && (
                      <td className="py-2">
                        {match?.best_matches.length
                          ? match.best_matches
                              .slice(0, 3)
                              .map((m) => `${m.title} (${Math.round(m.match_score * 100)}%)`)
                              .join(', ')
                          : '—'}
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
  const refs = tender.references_required
  if (!refs) {
    return <p className="text-sm text-muted-foreground">No reference data has been extracted</p>
  }

  return (
    <div className="space-y-2">
      {refs.notes ? (
        <>
          <p className="text-sm">{refs.notes}</p>
          <InfoTooltip>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-sm">
              <Field label="Count">{refs.count}</Field>
              <Field label="Type">{refs.type}</Field>
              <Field label="Value">{formatEur(refs.value_eur)}</Field>
              <Field label="Timeline">{refs.timeline_years} years</Field>
            </dl>
          </InfoTooltip>
        </>
      ) : (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-sm">
          <Field label="Count">{refs.count}</Field>
          <Field label="Type">{refs.type}</Field>
          <Field label="Value">{formatEur(refs.value_eur)}</Field>
          <Field label="Timeline">{refs.timeline_years} years</Field>
        </dl>
      )}
    </div>
  )
}
