import type { TenderDetailResponse } from '@/api/types'
import { formatEur } from '@/utils/formatting'
import { InfoTooltip } from '@/components/InfoTooltip'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children ?? '—'}</dd>
    </div>
  )
}

function EligibilitySubGroup({ title, notes, numericContent }: {
  title: string
  notes: string | null
  numericContent: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {notes && <InfoTooltip>{numericContent}</InfoTooltip>}
      </div>
      {notes ? (
        <p className="text-sm text-muted-foreground">{notes}</p>
      ) : (
        <div className="text-sm">{numericContent}</div>
      )}
    </div>
  )
}

interface EligibilitySectionProps {
  tender: TenderDetailResponse
}

export function EligibilitySection({ tender }: EligibilitySectionProps) {
  // Supersession logic: hide legacy sections when structured data exists
  const showExperts = !tender.team_requirements && !!tender.experts_required
  const showReferences = !tender.reference_requirements && !!tender.references_required
  const showTurnover = !!tender.turnover_required

  // Hide entire section if nothing to show
  if (!showExperts && !showReferences && !showTurnover) return null

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Eligibility Requirements</h2>
      <div className="space-y-4">
        {showExperts && tender.experts_required && (
          <EligibilitySubGroup
            title="Experts Required"
            notes={tender.experts_required.notes}
            numericContent={
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-sm">
                <Field label="International">{tender.experts_required.international}</Field>
                <Field label="Local">{tender.experts_required.local}</Field>
                <Field label="Key Experts">{tender.experts_required.key_experts}</Field>
                <Field label="Total">{tender.experts_required.total}</Field>
              </dl>
            }
          />
        )}
        {showReferences && tender.references_required && (
          <EligibilitySubGroup
            title="References Required"
            notes={tender.references_required.notes}
            numericContent={
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-sm">
                <Field label="Count">{tender.references_required.count}</Field>
                <Field label="Type">{tender.references_required.type}</Field>
                <Field label="Value">{formatEur(tender.references_required.value_eur)}</Field>
                <Field label="Timeline">{tender.references_required.timeline_years} years</Field>
              </dl>
            }
          />
        )}
        {showTurnover && tender.turnover_required && (
          <EligibilitySubGroup
            title="Turnover Required"
            notes={tender.turnover_required.notes}
            numericContent={
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <Field label="Annual">{formatEur(tender.turnover_required.annual_eur)}</Field>
                <Field label="Years">{tender.turnover_required.years}</Field>
              </dl>
            }
          />
        )}
      </div>
    </section>
  )
}
