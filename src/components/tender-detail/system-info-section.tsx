import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { TenderDetailResponse } from '@/api/types'
import { StatusBadge } from '@/components/StatusBadge'
import { runIdToUrl } from '@/utils/links'
import { cn } from '@/lib/utils'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children ?? '—'}</dd>
    </div>
  )
}

interface SystemInfoSectionProps {
  tender: TenderDetailResponse
}

export function SystemInfoSection({ tender }: SystemInfoSectionProps) {
  const [expanded, setExpanded] = useState(false)

  const discoveredRunUrl = runIdToUrl(tender.discovered_run_id)
  const processedRunUrl = runIdToUrl(tender.processed_run_id)

  return (
    <section>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-lg font-semibold"
      >
        <span className={cn("transition-transform", expanded && "rotate-90")}>▶</span>
        System Info
      </button>
      {expanded && (
        <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Scraper Status"><StatusBadge status={tender.status} /></Field>
          <Field label="Retry Count">{tender.retry_count}</Field>
          <Field label="Last Attempt">{tender.last_attempt ?? '—'}</Field>
          <Field label="Last Error">{tender.last_error ?? '—'}</Field>
          <Field label="Docs Downloaded">{tender.documents_downloaded}</Field>
          <Field label="Docs Failed">{tender.documents_failed}</Field>
          <Field label="Skip Reason">{tender.skip_reason ?? '—'}</Field>
          <Field label="Discovery Run">
            {discoveredRunUrl ? <Link to={discoveredRunUrl} className="text-primary underline">View</Link> : '—'}
          </Field>
          <Field label="Processing Run">
            {processedRunUrl ? <Link to={processedRunUrl} className="text-primary underline">View</Link> : '—'}
          </Field>
          <Field label="Analysis Model">{tender.analysis_model ?? '—'}</Field>
          <Field label="Analyzed At">{tender.analyzed_at ?? '—'}</Field>
          <Field label="Emailed At">{tender.emailed_at ?? '—'}</Field>
          <Field label="Source ID">{tender.source_id}</Field>
          <Field label="Tender ID">{tender.tender_id}</Field>
        </dl>
      )}
    </section>
  )
}
