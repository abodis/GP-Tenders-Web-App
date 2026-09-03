import { useState, useEffect } from 'react'
import type { TenderDetailResponse } from '@/api/types'
import { useTenderActions } from '@/hooks/useTenderActions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { formatEur } from '@/utils/formatting'

interface ReferenceRequirementsSectionProps {
  tender: TenderDetailResponse
  sourceId: string
  tenderId: string
}

function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const colorClass =
    confidence === 'high'
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : confidence === 'medium'
        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'

  return <Badge className={colorClass}>{confidence}</Badge>
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

export function ReferenceRequirementsSection({ tender, sourceId, tenderId }: ReferenceRequirementsSectionProps) {
  const { extractReferences } = useTenderActions(sourceId, tenderId)
  const [error, setError] = useState<ToastState | null>(null)

  const data = tender.reference_requirements

  // State: null + non-completed status → render nothing
  if (data === null && tender.status !== 'completed') return null

  // State: null + completed status → show extract button
  if (data === null) {
    return (
      <section>
        <h2 className="mb-3 text-lg font-semibold">Reference Requirements</h2>
        <Button
          variant="outline"
          disabled={extractReferences.isPending}
          onClick={() =>
            extractReferences.mutate(undefined, {
              onError: (err) => setError({ message: (err as Error).message || 'Extraction failed' }),
            })
          }
        >
          {extractReferences.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Extract Reference Requirements
        </Button>
        {error && <ErrorToast toast={error} onDismiss={() => setError(null)} />}
      </section>
    )
  }

  const requirements = data.reference_requirements

  // State: exists but empty array → empty state
  if (requirements.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-lg font-semibold">Reference Requirements</h2>
        <div className="flex items-center gap-2 mb-3">
          <ConfidenceBadge confidence={data.extraction_confidence} />
          <span className="text-sm text-muted-foreground">
            Total required: {data.total_references_required ?? 'Unknown'}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Extraction completed but no reference requirements were found in the tender documents.
        </p>
      </section>
    )
  }

  // State: exists with items → table
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Reference Requirements</h2>
      <div className="flex items-center gap-2 mb-3">
        <ConfidenceBadge confidence={data.extraction_confidence} />
        <span className="text-sm text-muted-foreground">
          Total required: {data.total_references_required ?? 'Unknown'}
        </span>
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
              <th className="pb-2 pr-4 font-medium">Donor Preference</th>
              <th className="pb-2 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {requirements.map((req, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2 pr-4">{req.domain}</td>
                <td className="py-2 pr-4">{req.mandatory ? 'Yes' : 'No'}</td>
                <td className="py-2 pr-4">{req.min_projects ?? '—'}</td>
                <td className="py-2 pr-4">{req.min_value_eur != null ? formatEur(req.min_value_eur) : '—'}</td>
                <td className="py-2 pr-4">{req.max_age_years ?? '—'}</td>
                <td className="py-2 pr-4">{req.region ?? '—'}</td>
                <td className="py-2 pr-4">{req.donor_preference ?? '—'}</td>
                <td className="py-2">{req.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
