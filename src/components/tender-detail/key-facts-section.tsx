import type { TenderDetailResponse } from '@/api/types'
import { formatBudget } from '@/utils/formatting'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children ?? '—'}</dd>
    </div>
  )
}

interface KeyFactsSectionProps {
  tender: TenderDetailResponse
}

export function KeyFactsSection({ tender }: KeyFactsSectionProps) {
  return (
    <section>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Field label="Budget">{formatBudget(tender.budget)}</Field>
        <Field label="Deadline">{tender.deadline ?? '—'}</Field>
        <Field label="Location">{tender.location_names ?? '—'}</Field>
        <Field label="Tender Type">{tender.tender_type ?? '—'}</Field>
        <Field label="Posted Date">{tender.posted_date}</Field>
        <Field label="Sectors">{tender.sectors ?? '—'}</Field>
        <Field label="Types">{tender.types ?? '—'}</Field>
        <Field label="Tags">
          {tender.analysis_tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {tender.analysis_tags.map((tag) => (
                <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {tag}
                </span>
              ))}
            </div>
          ) : '—'}
        </Field>
      </dl>
    </section>
  )
}
