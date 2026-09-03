import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import type { TenderDetailResponse } from '@/api/types'
import { useTenderActions } from '@/hooks/useTenderActions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ExclusionCriteriaSectionProps {
  tender: TenderDetailResponse
  sourceId: string
  tenderId: string
}

const confidenceColors: Record<string, string> = {
  high: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  low: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

const assessmentColors: Record<string, string> = {
  pass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  fail: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  uncertain: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
}

export function ExclusionCriteriaSection({ tender, sourceId, tenderId }: ExclusionCriteriaSectionProps) {
  const { exclusionCheck } = useTenderActions(sourceId, tenderId)
  const [error, setError] = useState<string | null>(null)

  const exclusionResult = tender.exclusion_result

  // Null + status not completed → render nothing
  if (exclusionResult === null && tender.status !== 'completed') return null

  // Null + status completed → show check button
  if (exclusionResult === null) {
    return (
      <section>
        <h2 className="mb-3 text-lg font-semibold">Exclusion Criteria</h2>
        <div className="space-y-2">
          <Button
            variant="outline"
            disabled={exclusionCheck.isPending}
            onClick={() => {
              setError(null)
              exclusionCheck.mutate(undefined, {
                onError: (err) => {
                  setError(err instanceof Error ? err.message : 'Check failed')
                },
              })
            }}
          >
            {exclusionCheck.isPending && <Loader2 className="size-4 animate-spin" />}
            Check Exclusion
          </Button>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
      </section>
    )
  }

  // Exists but empty criteria array
  if (exclusionResult.criteria.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-lg font-semibold">Exclusion Criteria</h2>
        <div className="flex items-center gap-2 mb-3">
          <Badge className={confidenceColors[exclusionResult.extraction_confidence]}>
            {exclusionResult.extraction_confidence}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">No exclusion criteria were identified for this tender.</p>
      </section>
    )
  }

  // Has criteria → render table (optionally with warning callout)
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Exclusion Criteria</h2>
      <div className="flex items-center gap-2 mb-3">
        <Badge className={confidenceColors[exclusionResult.extraction_confidence]}>
          {exclusionResult.extraction_confidence}
        </Badge>
      </div>

      {exclusionResult.uncertain_flags.length > 0 && (
        <div className="mb-4 rounded-lg border border-yellow-400/50 bg-yellow-50 p-3 dark:bg-yellow-950 dark:border-yellow-600/50">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 text-yellow-700 dark:text-yellow-400" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Uncertain criteria detected</p>
              <ul className="mt-1 list-inside list-disc text-sm text-yellow-700 dark:text-yellow-400">
                {exclusionResult.uncertain_flags.map((flag, i) => (
                  <li key={i}>{flag}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

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
    </section>
  )
}
