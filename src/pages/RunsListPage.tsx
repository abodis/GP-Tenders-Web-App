import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAllRuns } from '@/hooks/useAllRuns'
import { useSources } from '@/hooks/useSources'
import { filterRunsBySource } from '@/utils/filtering'
import { getErrorMessage } from '@/utils/errors'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorAlert } from '@/components/ErrorAlert'
import { StatusBadge } from '@/components/StatusBadge'

export default function RunsListPage() {
  const [sourceFilter, setSourceFilter] = useState<string | null>(null)
  const navigate = useNavigate()

  const { data: runs, isLoading, isError, error, refetch } = useAllRuns()
  const { data: sources } = useSources()

  if (isLoading) return <LoadingSpinner />
  if (isError) {
    return (
      <ErrorAlert
        message={getErrorMessage(error)}
        onRetry={() => { refetch() }}
      />
    )
  }

  const filteredRuns = filterRunsBySource(runs ?? [], sourceFilter)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Runs</h1>
        <select
          value={sourceFilter ?? ''}
          onChange={(e) => setSourceFilter(e.target.value || null)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All sources</option>
          {sources?.map((s) => (
            <option key={s.source_id} value={s.source_id}>
              {s.source_id}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Run Date</th>
              <th className="px-4 py-3 text-left font-medium">Source</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Found</th>
              <th className="px-4 py-3 text-right font-medium">New</th>
              <th className="px-4 py-3 text-right font-medium">Dupes</th>
              <th className="px-4 py-3 text-right font-medium">Errors</th>
              <th className="px-4 py-3 text-right font-medium">Processed</th>
              <th className="px-4 py-3 text-right font-medium">OK</th>
              <th className="px-4 py-3 text-right font-medium">Failed</th>
              <th className="px-4 py-3 text-right font-medium">Docs</th>
            </tr>
          </thead>
          <tbody>
            {filteredRuns.map((run) => {
              const c = run.collector_result
              const r = run.retriever_result
              return (
                <tr
                  key={run.pk}
                  onClick={() => navigate(`/runs/${run.source_id}/${run.run_date}`)}
                  className="cursor-pointer border-b transition-colors even:bg-muted/30 hover:bg-muted/50"
                >
                  <td className="px-4 py-3 whitespace-nowrap">{run.run_date}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{run.source_id}</td>
                  <td className="px-4 py-3"><StatusBadge status={run.status} /></td>
                  <td className="px-4 py-3 text-right">{c?.total_found ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{c?.new_tenders ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{c?.duplicates ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{c?.errors ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{r?.processed ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{r?.successful ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{r?.failed ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{r?.documents_downloaded ?? '—'}</td>
                </tr>
              )
            })}
            {filteredRuns.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                  No runs found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
