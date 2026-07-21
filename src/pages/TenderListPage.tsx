import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTenders } from '@/hooks/useTenders'
import { useSources } from '@/hooks/useSources'
import { formatBudget, getInterestingnessScoreBadgeColor, getUnifiedScoreBadgeColor } from '@/utils/formatting'
import { getErrorMessage } from '@/utils/errors'
import { DATE_PRESETS } from '@/utils/date-presets'
import { SearchInput } from '@/components/SearchInput'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorAlert } from '@/components/ErrorAlert'
import { StatusBadge } from '@/components/StatusBadge'
import { ScoreBadge } from '@/components/ScoreBadge'
import { Pagination } from '@/components/Pagination'
import { VisibilityBadge } from '@/components/VisibilityBadge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { CalendarDays, SlidersHorizontal, X } from 'lucide-react'
import devaidLogo from '@/assets/developmentaid-org-logo.svg'
import type { TenderListParams } from '@/api/types'

type SortField = 'discovered_at' | 'relevance_score' | 'interestingness_score' | 'unified_score' | 'budget' | 'deadline'
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

const SORT_FIELDS: SortField[] = ['discovered_at', 'relevance_score', 'interestingness_score', 'unified_score', 'budget', 'deadline']

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
  const pageParam = searchParams.get('page') ?? ''
  const q = searchParams.get('q') ?? ''
  const minInterestingness = searchParams.get('min_interestingness') ?? ''

  // Derive typed values from URL params
  const sortBy: SortField = isValidSortField(sortByParam) ? sortByParam : 'discovered_at'
  const sortDirection: SortDirection = isValidSortDirection(sortDirectionParam) ? sortDirectionParam : 'desc'
  const currentPage = Math.max(1, parseInt(pageParam, 10) || 1)

  const { data: sources } = useSources()

  // Validate min_interestingness on load: remove invalid values from URL
  useEffect(() => {
    if (!minInterestingness) return
    const parsed = parseInt(minInterestingness, 10)
    if (isNaN(parsed) || parsed < 1 || parsed > 10 || String(parsed) !== minInterestingness) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('min_interestingness')
        return next
      })
    }
  }, [minInterestingness, setSearchParams])

  // --- Build API params from URL ---
  const queryParams = useMemo<TenderListParams>(() => {
    const params: TenderListParams = {}
    if (status) params.status = status
    if (sourceId) params.source_id = sourceId
    if (discoveredFrom) params.discovered_from = discoveredFrom
    if (discoveredTo) params.discovered_to = discoveredTo
    if (analyzedParam === 'true') params.analyzed = 'true'
    if (analyzedParam === 'false') params.analyzed = 'false'
    if (q) params.q = q
    const parsedMin = parseInt(minInterestingness, 10)
    if (!isNaN(parsedMin) && parsedMin >= 1 && parsedMin <= 10) {
      params.min_interestingness = minInterestingness
    }
    // discovered_at is the default sort — don't send sort_by for it
    // When searching, omit sort params (results ranked by relevance)
    if (!q && sortBy !== 'discovered_at') params.sort_by = sortBy
    if (!q && sortBy !== 'discovered_at') params.sort_direction = sortDirection
    if (currentPage > 1) params.page = String(currentPage)
    return params
  }, [status, sourceId, discoveredFrom, discoveredTo, analyzedParam, q, minInterestingness, sortBy, sortDirection, currentPage])

  const { data, isLoading, isError, error, refetch } = useTenders(queryParams)

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
        next.delete('page')
        return next
      })
    },
    [setSearchParams],
  )

  const updatePagination = useCallback(
    (page: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (page > 1) {
          next.set('page', String(page))
        } else {
          next.delete('page')
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
    updatePagination(page)
  }

  // --- Computed pagination values ---
  const tenders = data?.items ?? []
  const totalCount = data?.total_count ?? null
  const totalPages = data?.total_pages ?? 1
  const hasNextPage = totalPages !== null && currentPage < totalPages
  const hasPreviousPage = currentPage > 1
  const from = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const to = totalCount === 0 ? 0 : Math.min(currentPage * PAGE_SIZE, totalCount ?? currentPage * PAGE_SIZE)

  // --- Analyzed filter display value ---
  const analyzedDisplay = analyzedParam === 'true' ? 'analyzed' : analyzedParam === 'false' ? 'unanalyzed' : 'all'

  // --- Active filters detection ---
  const hasActiveFilters = status !== '' || sourceId !== '' || discoveredFrom !== '' || discoveredTo !== '' || analyzedParam !== '' || q !== '' || minInterestingness !== ''

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
        {/* Date group */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CalendarDays className="size-3" />
              Period
            </span>
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
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">From</span>
            <input
              type="date"
              value={discoveredFrom}
              onChange={(e) => updateFilters({ discovered_from: e.target.value })}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">To</span>
            <input
              type="date"
              value={discoveredTo}
              onChange={(e) => updateFilters({ discovered_to: e.target.value })}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
        </div>

        {/* Vertical divider */}
        <div className="hidden sm:block self-stretch my-1 w-px bg-border" />

        {/* Filter group */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <SlidersHorizontal className="size-3" />
              Status
            </span>
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
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Source</span>
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
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Analysis</span>
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

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Min Interestingness</span>
            <Select
              value={minInterestingness || '__all__'}
              onValueChange={(v) => updateFilters({ min_interestingness: v === '__all__' ? '' : v ?? '' })}
              items={[
                { value: '__all__', label: 'All' },
                ...Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}+` })),
              ]}
            >
              <SelectTrigger className="min-w-[100px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                {Array.from({ length: 10 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}+</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => navigate('/tenders')}
            className="mb-0.5 flex items-center gap-1 self-end rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3" />
            Clear filters
          </button>
        )}
      </div>

      {/* Search bar */}
      <SearchInput
        value={q}
        onChange={(value) => updateFilters({ q: value })}
      />

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-[24%] px-4 py-3 text-left font-medium">Title</th>
              <th className="w-[10%] px-4 py-3 text-left font-medium">Organization</th>
              <th className="w-[7%] px-4 py-3 text-left font-medium">Status</th>
              <th
                className={cn("w-[5%] px-4 py-3 text-left font-medium select-none", q ? "opacity-50 cursor-default" : "cursor-pointer")}
                onClick={q ? undefined : () => handleSort('relevance_score')}
                aria-sort={getAriaSort('relevance_score', sortBy, sortDirection)}
              >
                Score{sortIndicator('relevance_score')}
              </th>
              <th
                className={cn("w-[5%] px-4 py-3 text-left font-medium select-none", q ? "opacity-50 cursor-default" : "cursor-pointer")}
                onClick={q ? undefined : () => handleSort('interestingness_score')}
                aria-sort={getAriaSort('interestingness_score', sortBy, sortDirection)}
              >
                Interest.{sortIndicator('interestingness_score')}
              </th>
              <th
                className={cn("w-[5%] px-4 py-3 text-left font-medium select-none", q ? "opacity-50 cursor-default" : "cursor-pointer")}
                onClick={q ? undefined : () => handleSort('unified_score')}
                aria-sort={getAriaSort('unified_score', sortBy, sortDirection)}
              >
                Unified{sortIndicator('unified_score')}
              </th>
              <th
                className={cn("w-[8%] px-4 py-3 text-right font-medium select-none", q ? "opacity-50 cursor-default" : "cursor-pointer")}
                onClick={q ? undefined : () => handleSort('budget')}
                aria-sort={getAriaSort('budget', sortBy, sortDirection)}
              >
                Budget{sortIndicator('budget')}
              </th>
              <th
                className={cn("w-[8%] px-4 py-3 text-left font-medium select-none", q ? "opacity-50 cursor-default" : "cursor-pointer")}
                onClick={q ? undefined : () => handleSort('deadline')}
                aria-sort={getAriaSort('deadline', sortBy, sortDirection)}
              >
                Deadline{sortIndicator('deadline')}
              </th>
              <th className="w-[9%] px-4 py-3 text-left font-medium">Location</th>
              <th className="w-[10%] px-4 py-3 text-left font-medium">Source</th>
              <th
                className={cn("w-[9%] px-4 py-3 text-left font-medium select-none", q ? "opacity-50 cursor-default" : "cursor-pointer")}
                onClick={q ? undefined : () => handleSort('discovered_at')}
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
                <td className="px-4 py-3">
                  {(() => {
                    const { color, label } = getInterestingnessScoreBadgeColor(t.interestingness_score)
                    const colorClasses: Record<string, string> = {
                      green: 'bg-green-100 text-green-800',
                      yellow: 'bg-yellow-100 text-yellow-800',
                      red: 'bg-red-100 text-red-800',
                      gray: 'bg-gray-100 text-gray-600',
                    }
                    return (
                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', colorClasses[color])}>
                        {label}
                      </span>
                    )
                  })()}
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const { color, label } = getUnifiedScoreBadgeColor(t.unified_score)
                    const colorClasses: Record<string, string> = {
                      green: 'bg-green-100 text-green-800',
                      yellow: 'bg-yellow-100 text-yellow-800',
                      red: 'bg-red-100 text-red-800',
                      gray: 'bg-gray-100 text-gray-600',
                    }
                    return (
                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', colorClasses[color])}>
                        {label}
                      </span>
                    )
                  })()}
                </td>
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
                <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                  {q ? (
                    <div className="space-y-2">
                      <p>No tenders match your search</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          updateFilters({ q: '' })
                        }}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Clear search
                      </button>
                    </div>
                  ) : (
                    'No tenders found'
                  )}
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
      />
    </div>
  )
}
