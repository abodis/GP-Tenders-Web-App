import { useState } from 'react'
import type { TenderDetailResponse } from '@/api/types'
import type { TenderState } from '@/utils/tender-state'
import { humanizeTenderType } from '@/utils/format'
import { formatBudget } from '@/utils/formatting'
import { DocumentsSection } from './documents-section'

interface DetailsSectionProps {
  tender: TenderDetailResponse
  state: TenderState
  sourceId: string
  tenderId: string
}

function formatDeadline(deadline: string | null): string {
  if (deadline == null) return '—'
  const date = new Date(deadline)
  if (isNaN(date.getTime())) return deadline
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function KeyFact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

export function DetailsSection({ tender, state, sourceId, tenderId }: DetailsSectionProps) {
  const hasAnalysisSummary = tender.analysis_summary != null
  const defaultExpanded = state === 'unanalyzed' || !hasAnalysisSummary
  const [descriptionExpanded, setDescriptionExpanded] = useState(defaultExpanded)

  const tenderTypeDisplay = humanizeTenderType(tender.tender_type) ?? '—'

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold">Details</h2>

      {/* Key Facts */}
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KeyFact label="Budget">{formatBudget(tender.budget)}</KeyFact>
        <KeyFact label="Tender Type">{tenderTypeDisplay}</KeyFact>
        <KeyFact label="Deadline">{formatDeadline(tender.deadline)}</KeyFact>
        <KeyFact label="Location">{tender.location_names ?? '—'}</KeyFact>
      </dl>

      {/* Description */}
      {tender.description_text != null && (
        <div>
          {hasAnalysisSummary && !descriptionExpanded ? (
            <button
              onClick={() => setDescriptionExpanded(true)}
              className="text-sm font-medium text-primary underline"
            >
              View raw description
            </button>
          ) : (
            <div className="space-y-2">
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {tender.description_text}
              </p>
              {hasAnalysisSummary && (
                <button
                  onClick={() => setDescriptionExpanded(false)}
                  className="text-sm font-medium text-primary underline"
                >
                  Show less
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Documents */}
      <DocumentsSection sourceId={sourceId} tenderId={tenderId} />
    </section>
  )
}
