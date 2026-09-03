import type { TenderDetailResponse } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { InfoTooltip } from '@/components/InfoTooltip'
import { formatEur } from '@/utils/formatting'

interface ExclusionTabProps {
  tender: TenderDetailResponse
  state: 'fully_analyzed' | 'legacy_analyzed'
}

const assessmentColors: Record<string, string> = {
  pass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  fail: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  uncertain: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
}

const confidenceColors: Record<string, string> = {
  high: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  low: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children ?? '—'}</dd>
    </div>
  )
}

export function ExclusionTab({ tender, state }: ExclusionTabProps) {
  if (state === 'fully_analyzed') {
    const exclusionResult = tender.exclusion_result

    if (!exclusionResult) {
      return <p className="text-sm text-muted-foreground">No exclusion data has been extracted</p>
    }

    if (exclusionResult.criteria.length === 0) {
      return <p className="text-sm text-muted-foreground">No exclusion data has been extracted</p>
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{exclusionResult.extraction_confidence} confidence</Badge>
          {exclusionResult.excluded && (
            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
              Excluded
            </Badge>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Criterion</th>
                <th className="pb-2 pr-4 font-medium">Category</th>
                <th className="pb-2 pr-4 font-medium">Assessment</th>
                <th className="pb-2 pr-4 font-medium">Confidence</th>
                <th className="pb-2 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {exclusionResult.criteria.map((criterion, idx) => (
                <tr key={idx} className="border-b last:border-0">
                  <td className="py-2 pr-4">{criterion.criterion}</td>
                  <td className="py-2 pr-4 capitalize">{criterion.category}</td>
                  <td className="py-2 pr-4">
                    <Badge className={assessmentColors[criterion.assessment]}>
                      {criterion.assessment}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4">
                    <Badge className={confidenceColors[criterion.confidence]}>
                      {criterion.confidence}
                    </Badge>
                  </td>
                  <td className="py-2">{criterion.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // legacy_analyzed
  const turnover = tender.turnover_required
  if (!turnover) {
    return <p className="text-sm text-muted-foreground">No exclusion data has been extracted</p>
  }

  return (
    <div className="space-y-2">
      {turnover.notes ? (
        <>
          <p className="text-sm">{turnover.notes}</p>
          <InfoTooltip>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <Field label="Annual">{formatEur(turnover.annual_eur)}</Field>
              <Field label="Years">{turnover.years}</Field>
            </dl>
          </InfoTooltip>
        </>
      ) : (
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <Field label="Annual">{formatEur(turnover.annual_eur)}</Field>
          <Field label="Years">{turnover.years}</Field>
        </dl>
      )}
    </div>
  )
}
