import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenders } from '@/hooks/useTenders'
import { useSources } from '@/hooks/useSources'
import { sortTendersClientSide } from '@/utils/sorting'
import { formatBudget } from '@/utils/formatting'
import { getErrorMessage } from '@/utils/errors'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorAlert } from '@/components/ErrorAlert'
import { StatusBadge } from '@/components/StatusBadge'
import { ScoreBadge } from '@/components/ScoreBadge'
import { LoadMoreButton } from '@/components/LoadMoreButton'
import type { TenderListParams } from '@/api/types'

type SortField = 'discovered_at' | 'relevance_score' | 'budget' | 'deadline'
type SortDirection = 'asc' | 'desc'
type AnalyzedFilter = 'all' | 'analyzed' | 'unanalyzed'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'permanently_failed', label: 'Permanently failed' },
  { value: 'skipped', label: 'Skipped' },
]

export default function TenderListPage() {
  const navigate = useNavigate()

  // Filter state
  const [status, setStatus] = useState('')
  const [sourceId, setSourceId] = useState('')
  const [discoveredFrom, setDiscoveredFrom] = useState('')
  const [discoveredTo, setDiscoveredTo] = useState('')
  const [analyzed, setAnalyzed] = useState<AnalyzedFilter>('all')

  // Sort state
  const [sortBy, setSortBy] = useState<SortField>('discovered_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const { data: sources } = useSources()

  // Build query params for the API
  const queryParams = useMemo<Omit<TenderListParams, 'cursor'>>(() => {
    const params: Omit<TenderListParams, 'cursor'> = {}
    if (status) params.status = status
    if (sourceId) params.source_id = sourceId
    if (discoveredFrom) params.discovered_from = discoveredFrom
    if (discoveredTo) params.discovered_to = discoveredTo
    if (analyzed === 'analyzed') params.analyzed = 'true'
    if (analyzed === 'unanalyzed') params.analyzed = 'false'
    if (sortBy === 'relevance_score') params.sort_by = 'relevance_score'
    return params
  }, [status, sourceId, discoveredFrom, discoveredTo, analyzed, sortBy])

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useTenders(queryParams)

  // Flatten all pages into a single list
  const allTenders = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  )

  // Apply client-side sorting for budget/deadline
  const tenders = useMemo(() => {
    if (sortBy === 'budget' || sortBy === 'deadline') {
      return sortTendersClientSide(allTenders, sortBy, sortDirection)
    }
    return allTenders
  }, [allTenders, sortBy, sortDirection])

  function handleSort(field: SortField) {
    if (field === sortBy) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortDirection(field === 'discovered_at' ? 'desc' : 'desc')
    }
  }

  function sortIndicator(field: SortField) {
    if (sortBy !== field) return ''
    return sortDirection === 'asc' ? ' ↑' : ' ↓'
  }

  if (isLoading) return <LoadingSpinner />
  if (isError) {
    return (
      <ErrorAlert
        message={getErrorMessage(error)}
        onRetry={() => { refetch() }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Tenders</h1>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <select
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All sources</option>
          {sources?.map((s) => (
            <option key={s.source_id} value={s.source_id}>{s.source_id}</option>
          ))}
        </select>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">From</span>
          <input
            type="date"
            value={discoveredFrom}
            onChange={(e) => setDiscoveredFrom(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">To</span>
          <input
            type="date"
            value={discoveredTo}
            onChange={(e) => setDiscoveredTo(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>

        <select
          value={analyzed}
          onChange={(e) => setAnalyzed(e.target.value as AnalyzedFilter)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All tenders</option>
          <option value="analyzed">Analyzed only</option>
          <option value="unanalyzed">Unanalyzed only</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Title</th>
              <th className="px-4 py-3 text-left font-medium">Organization</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th
                className="px-4 py-3 text-left font-medium cursor-pointer select-none"
                onClick={() => handleSort('relevance_score')}
              >
                Score{sortIndicator('relevance_score')}
              </th>
              <th
                className="px-4 py-3 text-right font-medium cursor-pointer select-none"
                onClick={() => handleSort('budget')}
              >
                Budget{sortIndicator('budget')}
              </th>
              <th
                className="px-4 py-3 text-left font-medium cursor-pointer select-none"
                onClick={() => handleSort('deadline')}
              >
                Deadline{sortIndicator('deadline')}
              </th>
              <th className="px-4 py-3 text-left font-medium">Location</th>
              <th className="px-4 py-3 text-left font-medium">Source</th>
              <th
                className="px-4 py-3 text-left font-medium cursor-pointer select-none"
                onClick={() => handleSort('discovered_at')}
              >
                Discovered{sortIndicator('discovered_at')}
              </th>
            </tr>
          </thead>
          <tbody>
            {tenders.map((t) => (
              <tr
                key={`${t.source_id}-${t.tender_id}`}
                onClick={() => navigate(`/tenders/${t.source_id}/${t.tender_id}`)}
                className="cursor-pointer border-b transition-colors hover:bg-muted/50"
              >
                <td className="px-4 py-3 max-w-xs truncate" title={t.title}>{t.title}</td>
                <td className="px-4 py-3 whitespace-nowrap">{t.organization ?? '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-3"><ScoreBadge score={t.relevance_score} /></td>
                <td className="px-4 py-3 text-right whitespace-nowrap">{formatBudget(t.budget)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{t.deadline ?? '—'}</td>
                <td className="px-4 py-3 whitespace-nowrap">{t.location_names ?? '—'}</td>
                <td className="px-4 py-3 whitespace-nowrap">{t.source_id}</td>
                <td className="px-4 py-3 whitespace-nowrap">{t.discovered_at.slice(0, 10)}</td>
              </tr>
            ))}
            {tenders.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  No tenders found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hasNextPage && (
        <LoadMoreButton onClick={() => fetchNextPage()} isLoading={isFetchingNextPage} />
      )}
    </div>
  )
}
