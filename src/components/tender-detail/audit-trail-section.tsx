import { useState } from 'react'
import { useTenderAudit } from '@/hooks/useTenderAudit'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const STEP_OPTIONS = [
  { value: '__all__', label: 'All' },
  { value: 'analysis', label: 'analysis' },
  { value: 'team_extraction', label: 'team_extraction' },
  { value: 'team_match', label: 'team_match' },
  { value: 'reference_extraction', label: 'reference_extraction' },
  { value: 'reference_match', label: 'reference_match' },
  { value: 'exclusion', label: 'exclusion' },
  { value: 'interestingness', label: 'interestingness' },
  { value: 'unified_score', label: 'unified_score' },
]

interface AuditTrailSectionProps {
  sourceId: string
  tenderId: string
}

export function AuditTrailSection({ sourceId, tenderId }: AuditTrailSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const [stepFilter, setStepFilter] = useState('__all__')
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set())

  const step = stepFilter === '__all__' ? undefined : stepFilter
  const { data: records, isLoading, isError, refetch } = useTenderAudit(sourceId, tenderId, {
    step,
    enabled: expanded,
  })

  const sorted = records
    ? [...records].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : []

  function toggleRecord(id: string) {
    setExpandedRecords((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-lg font-semibold"
      >
        <span className={cn('transition-transform', expanded && 'rotate-90')}>▶</span>
        Audit Trail
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Step:</span>
            <Select
              value={stepFilter}
              onValueChange={(v) => setStepFilter(v ?? '__all__')}
              items={STEP_OPTIONS}
            >
              <SelectTrigger className="min-w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STEP_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading audit records…</p>
          )}

          {isError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">Failed to load audit records.</p>
              <button
                onClick={() => refetch()}
                className="mt-1 text-sm font-medium text-destructive underline"
              >
                Retry
              </button>
            </div>
          )}

          {!isLoading && !isError && sorted.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No audit records found for the current filter.
            </p>
          )}

          {!isLoading && !isError && sorted.length > 0 && (
            <div className="space-y-1">
              {sorted.map((record) => {
                const isOpen = expandedRecords.has(record.id)
                return (
                  <div key={record.id} className="rounded-md border">
                    <button
                      onClick={() => toggleRecord(record.id)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/50"
                    >
                      <span className={cn('text-xs transition-transform', isOpen && 'rotate-90')}>
                        ▶
                      </span>
                      <span className="font-medium">{record.step}</span>
                      <span className="text-muted-foreground">{record.model ?? '—'}</span>
                      <span className="text-muted-foreground">
                        {new Date(record.created_at).toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">
                        {record.duration_ms != null ? `${record.duration_ms}ms` : '—'}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="max-h-[400px] overflow-auto border-t px-3 py-2">
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">input_snapshot</p>
                            <pre className="mt-1 rounded bg-muted p-2 text-xs">
                              {JSON.stringify(record.input_snapshot, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">output</p>
                            <pre className="mt-1 rounded bg-muted p-2 text-xs">
                              {JSON.stringify(record.output, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
