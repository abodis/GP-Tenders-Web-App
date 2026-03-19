import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTenders } from '@/hooks/useTenders'
import { useSources } from '@/hooks/useSources'
import { formatBudget } from '@/utils/formatting'
import { getErrorMessage } from '@/utils/errors'
import { DATE_PRESETS } from '@/utils/date-presets'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorAlert } from '@/components/ErrorAlert'
import { StatusBadge } from '@/components/StatusBadge'
import { ScoreBadge } from '@/components/ScoreBadge'
import { Pagination } from '@/components/Pagination'
import { VisibilityBadge } from '@/components/VisibilityBadge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import devaidLogo from '@/assets/developmentaid-org-logo.svg'
import type { TenderListParams } from '@/api/types'

type SortField = 'discovered_at' | 'relevance_score' | 'budget' | 'deadline'
type SortDirection = 'asc' | 'desc'

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'permanently_failed', label: 'Permanently failed' },
  { value: 'skipped', label: 'Skipped' },
]

const SORT_FIELDS: SortField[] = ['discovered_at', 'relevance_score', 'budget', 'deadline']

function isValidSortField(value: string | null): value is SortField {
  return value !== null && (SORT_FIELDS as string[]).includes(value)
}

function isValidSortDirection(value: string | null): value is SortDirection {
  return value === 'asc' || value === 'desc'
}

/**
 * Map sort field to the aria-sort attribute value.
 */
function getAriaSort(field: SortField, activeSortBy: SortField, direction: SortDirection): 'ascending' | 'descending' | 'none' {
  if (field !== activeSortBy) return 'none'
  return direction === 'asc' ? 'ascending' : 'descending'
}

export default function TenderListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // --- Read URL params ---
  const status = searchParams.get('status') ?? ''
  const sourceId = searchParams.get('source_id') ?? ''
  const discoveredFrom = searchParams.get('discovered_from') ?? ''
  const discoveredTo = searchParams.get('discovered_to') ?? ''
  const analyzedParam = searchParams.get('analyzed') ?? ''
  const sortByParam = searchParams.get('sort_by')
  const sortDirectionParam = searchParams.get('sort_direction')
  const cursorParam = searchParams.get('cursor') ?? ''
  const pageParam = searchParams.get('page') ?? ''

  // Derive typed values from URL params
  const sortBy: SortField = isValidSortField(sortByParam) ? sortByParam : 'discovered_at'
  const sortDirection: SortDirection = isValidSortDirection(sortDirectionParam) ? sortDirectionParam : 'desc'
  const currentPage = Math.max(1, parseInt(pageParam, 10) || 1)
  const cursor = cursorParam || undefined

  // --- Cursor stack ---
  // cursors[0] = undefined (page 1 needs no cursor)
  // cursors[N] = cursor for page N+1
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined])
  // Track the latest next_cursor from the API response via ref (no re-render needed)
  const latestNextCursor = useRef<string | undefined>(undefined)

  const { data: sources } = useSources()

  // --- Build API params from URL ---
  const queryParams = useMemo<TenderListParams>(() => {
    const params: TenderListParams = {}
    if (status) params.status = status
    if (sourceId) params.source_id = sourceId
    if (discoveredFrom) params.discovered_from = discoveredFrom
    if (discoveredTo) params.discovered_to = discoveredTo
    if (analyzedParam === 'true') params.analyzed = 'true'
    if (analyzedParam === 'false') params.analyzed = 'false'
    // discovered_at is the default sort — don't send sort_by for it
    if (sortBy !== 'discovered_at') params.sort_by = sortBy
    if (sortBy !== 'discovered_at') params.sort_direction = sortDirection
    if (cursor) params.cursor = cursor
    return params
  }, [status, sourceId, discoveredFrom, discoveredTo, analyzedParam, sortBy, sortDirection, cursor])

  const { data, isLoading, isError, error, refetch } = useTenders(queryParams)

  // Sync the latest next_cursor into the ref via effect (safe: no state update)
  useEffect(() => {
    latestNextCursor.current = data?.next_cursor ?? undefined
  }, [data?.next_cursor])

  // --- Helper: update URL params ---
  const updateFilters = useCallback(
    (updates: Record<string, string>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        // Apply updates, remove empty values
        for (const [key, value] of Object.entries(updates)) {
          if (value) {
            next.set(key, value)
          } else {
            next.delete(key)
          }
        }
        // Reset pagination when filters/sort change
        next.delete('cursor')
        next.delete('page')
        return next
      })
      // Clear cursor stack when filters change
      setCursors([undefined])
    },
    [setSearchParams],
  )

  const updatePagination = useCallback(
    (page: number, pageCursor: string | undefined) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (page > 1) {
          next.set('page', String(page))
        } else {
          next.delete('page')
        }
        if (pageCursor) {
          next.set('cursor', pageCursor)
        } else {
          next.delete('cursor')
        }
        return next
      })
    },
    [setSearchParams],
  )

  // --- Sort handler ---
  function handleSort(field: SortField) {
    if (field === sortBy) {
      updateFilters({
        sort_by: field === 'discovered_at' ? '' : field,
        sort_direction: sortDirection === 'asc' ? 'desc' : 'asc',
      })
    } else {
      updateFilters({
        sort_by: field === 'discovered_at' ? '' : field,
        sort_direction: 'desc',
      })
    }
  }

  function sortIndicator(field: SortField) {
    if (sortBy !== field) return null
    return (
      <span aria-hidden="true" className="ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    )
  }

  // --- Date preset handler ---
  function handleDatePreset(presetLabel: string | null) {
    if (presetLabel === '__clear__') {
      updateFilters({ discovered_from: '', discovered_to: '' })
      return
    }
    const preset = DATE_PRESETS.find((p) => p.label === presetLabel)
    if (!preset) return
    const range = preset.getRange()
    updateFilters({
      discovered_from: range.from,
      discovered_to: range.to,
    })
  }

  // Derive which preset matches the current date range (if any)
  const discoveredPreset = useMemo(() => {
    if (!discoveredFrom && !discoveredTo) return '__clear__'
    const match = DATE_PRESETS.find((p) => {
      const range = p.getRange()
      return range.from === discoveredFrom && range.to === discoveredTo
    })
    return match?.label ?? '__clear__'
  }, [discoveredFrom, discoveredTo])

  // --- Page change handler ---
  function handlePageChange(page: number) {
    // When navigating forward, store the current next_cursor for the next page
    if (page === currentPage + 1 && latestNextCursor.current) {
      setCursors((prev) => {
        if (prev[currentPage] === latestNextCursor.current) return prev
        const next = [...prev]
        next[currentPage] = latestNextCursor.current
        return next
      })
    }
    const pageCursor = page === currentPage + 1
      ? latestNextCursor.current
      : cursors[page - 1]
    updatePagination(page, pageCursor)
  }

  // --- Computed pagination values ---
  const tenders = data?.items ?? []
  const totalCount = data?.total_count ?? null
  const totalPages = totalCount !== null ? Math.max(1, Math.ceil(totalCount / PAGE_SIZE)) : 1
  const hasNextPage = data?.next_cursor !== null && data?.next_cursor !== undefined
  const hasPreviousPage = currentPage > 1
  const from = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const to = totalCount === 0 ? 0 : Math.min(currentPage * PAGE_SIZE, totalCount ?? currentPage * PAGE_SIZE)

  // Build visited pages set for the Pagination component
  const visitedPages = useMemo(() => {
    const visited = new Set<number>()
    for (let i = 0; i < cursors.length; i++) {
      visited.add(i + 1)
    }
    return visited
  }, [cursors])

  // --- Analyzed filter display value ---
  const analyzedDisplay = analyzedParam === 'true' ? 'analyzed' : analyzedParam === 'false' ? 'unanalyzed' : 'all'

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
      <div>
        <h1 className="text-2xl font-bold">Tenders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse and filter discovered tenders, review relevance scores and analysis results.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3">
        <Select
          value={discoveredPreset}
          onValueChange={handleDatePreset}
          items={[
            { value: '__clear__', label: 'All dates' },
            ...DATE_PRESETS.map((p) => ({ value: p.label, label: p.label })),
          ]}
        >
          <SelectTrigger className="min-w-[140px]">
            <SelectValue placeholder="All dates" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__clear__">All dates</SelectItem>
            {DATE_PRESETS.map((p) => (
              <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">From</span>
          <input
            type="date"
            value={discoveredFrom}
            onChange={(e) => updateFilters({ discovered_from: e.target.value })}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">To</span>
          <input
            type="date"
            value={discoveredTo}
            onChange={(e) => updateFilters({ discovered_to: e.target.value })}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          />
        </label>

        <Select
          value={status || '__all__'}
          onValueChange={(v) => updateFilters({ status: v === '__all__' ? '' : v ?? '' })}
          items={STATUS_OPTIONS.map((opt) => ({
            value: opt.value || '__all__',
            label: opt.label,
          }))}
        >
          <SelectTrigger className="min-w-[150px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || '__all__'} value={opt.value || '__all__'}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sourceId || '__all__'}
          onValueChange={(v) => updateFilters({ source_id: v === '__all__' ? '' : v ?? '' })}
          items={[
            { value: '__all__', label: 'All sources' },
            ...(sources?.map((s) => ({ value: s.source_id, label: s.source_id })) ?? []),
          ]}
        >
          <SelectTrigger className="min-w-[140px]">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All sources</SelectItem>
            {sources?.map((s) => (
              <SelectItem key={s.source_id} value={s.source_id}>{s.source_id}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={analyzedDisplay}
          onValueChange={(v) => {
            updateFilters({ analyzed: v === 'analyzed' ? 'true' : v === 'unanalyzed' ? 'false' : '' })
          }}
          items={[
            { value: 'all', label: 'All tenders' },
            { value: 'analyzed', label: 'Analyzed only' },
            { value: 'unanalyzed', label: 'Unanalyzed only' },
          ]}
        >
          <SelectTrigger className="min-w-[140px]">
            <SelectValue placeholder="All tenders" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tenders</SelectItem>
            <SelectItem value="analyzed">Analyzed only</SelectItem>
            <SelectItem value="unanalyzed">Unanalyzed only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-[28%] px-4 py-3 text-left font-medium">Title</th>
              <th className="w-[12%] px-4 py-3 text-left font-medium">Organization</th>
              <th className="w-[7%] px-4 py-3 text-left font-medium">Status</th>
              <th
                className="w-[5%] px-4 py-3 text-left font-medium cursor-pointer select-none"
                onClick={() => handleSort('relevance_score')}
                aria-sort={getAriaSort('relevance_score', sortBy, sortDirection)}
              >
                Score{sortIndicator('relevance_score')}
              </th>
              <th
                className="w-[8%] px-4 py-3 text-right font-medium cursor-pointer select-none"
                onClick={() => handleSort('budget')}
                aria-sort={getAriaSort('budget', sortBy, sortDirection)}
              >
                Budget{sortIndicator('budget')}
              </th>
              <th
                className="w-[9%] px-4 py-3 text-left font-medium cursor-pointer select-none"
                onClick={() => handleSort('deadline')}
                aria-sort={getAriaSort('deadline', sortBy, sortDirection)}
              >
                Deadline{sortIndicator('deadline')}
              </th>
              <th className="w-[10%] px-4 py-3 text-left font-medium">Location</th>
              <th className="w-[10%] px-4 py-3 text-left font-medium">Source</th>
              <th
                className="w-[9%] px-4 py-3 text-left font-medium cursor-pointer select-none"
                onClick={() => handleSort('discovered_at')}
                aria-sort={getAriaSort('discovered_at', sortBy, sortDirection)}
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
                className="cursor-pointer border-b transition-colors even:bg-muted/30 hover:bg-muted/50"
              >
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <VisibilityBadge fullyVisible={t.fully_visible} />
                    <span className="truncate" title={t.title}>{t.title}</span>
                  </span>
                </td>
                <td className="px-4 py-3 truncate" title={t.organization ?? ''}>{t.organization ?? '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-3"><ScoreBadge score={t.relevance_score} /></td>
                <td className="px-4 py-3 text-right whitespace-nowrap">{formatBudget(t.budget)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{t.deadline ?? '—'}</td>
                <td className="px-4 py-3 truncate" title={t.location_names ?? ''}>{t.location_names ?? '—'}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {t.source_id === 'developmentaid-org' ? (
                    <img src={devaidLogo} alt="developmentaid.org" className="h-4" />
                  ) : (
                    t.source_id
                  )}
                </td>
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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
        from={from}
        to={to}
        total={totalCount}
        visitedPages={visitedPages}
      />
    </div>
  )
}
