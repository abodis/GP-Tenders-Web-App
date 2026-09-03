import { useState } from 'react'
import type { TenderDetailResponse } from '@/api/types'
import { useTenderAudit } from '@/hooks/useTenderAudit'
import { cn } from '@/lib/utils'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children ?? '—'}</dd>
    </div>
  )
}

interface DeveloperSectionProps {
  tender: TenderDetailResponse
  sourceId: string
  tenderId: string
}

export function DeveloperSection({ tender, sourceId, tenderId }: DeveloperSectionProps) {
  const [expanded, setExpanded] = useState(false)

  const { data: records, isLoading, isError } = useTenderAudit(sourceId, tenderId, {
    enabled: expanded,
  })

  const sorted = records
    ? [...records].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : []

  return (
    <section>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-lg font-semibold"
      >
        <span className={cn('transition-transform', expanded && 'rotate-90')}>▶</span>
        Developer
      </button>

      {expanded && (
        <div className="mt-3 space-y-6">
          {/* System Info — always renders from tender props */}
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Field label="Retry Count">{tender.retry_count}</Field>
            <Field label="Last Attempt">{tender.last_attempt ?? '—'}</Field>
            <Field label="Last Error">{tender.last_error ?? '—'}</Field>
            <Field label="S3 Prefix">{tender.s3_prefix ?? '—'}</Field>
            <Field label="Discovered Run ID">{tender.discovered_run_id ?? '—'}</Field>
            <Field label="Processed Run ID">{tender.processed_run_id ?? '—'}</Field>
            <Field label="Analysis Model">{tender.analysis_model ?? '—'}</Field>
          </dl>

          {/* Audit Trail — fetched independently, errors don't affect system info */}
          <AuditTrail records={sorted} isLoading={isLoading} isError={isError} />
        </div>
      )}
    </section>
  )
}

function AuditTrail({
  records,
  isLoading,
  isError,
}: {
  records: { id: string; step: string; run_id: string | null; created_at: string; model: string | null; model_version: string | null; duration_ms: number | null }[]
  isLoading: boolean
  isError: boolean
}) {
  if (isError) {
    return (
      <p className="text-sm text-destructive">Could not load audit records</p>
    )
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading audit records…</p>
  }

  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground">No audit records</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs font-medium text-muted-foreground">
            <th className="pb-2 pr-4">Step</th>
            <th className="pb-2 pr-4">Run ID</th>
            <th className="pb-2 pr-4">Created</th>
            <th className="pb-2 pr-4">Model</th>
            <th className="pb-2 pr-4">Version</th>
            <th className="pb-2 pr-4">Duration</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id} className="border-b last:border-0">
              <td className="py-2 pr-4 font-medium">{record.step}</td>
              <td className="py-2 pr-4 font-mono text-xs">{record.run_id ?? '—'}</td>
              <td className="py-2 pr-4">{new Date(record.created_at).toLocaleString()}</td>
              <td className="py-2 pr-4">{record.model ?? '—'}</td>
              <td className="py-2 pr-4">{record.model_version ?? '—'}</td>
              <td className="py-2 pr-4">{record.duration_ms != null ? `${record.duration_ms}ms` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
