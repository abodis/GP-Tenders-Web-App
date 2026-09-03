import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTenders } from '@/hooks/useTenders'
import { useSources } from '@/hooks/useSources'
import { formatBudget, formatScore } from '@/utils/formatting'
import { getErrorMessage } from '@/utils/errors'
import { DATE_PRESETS } from '@/utils/date-presets'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorAlert } from '@/components/ErrorAlert'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { CalendarDays, ChevronDown, CircleSlash, Clock, ExternalLink, Search, SlidersHorizontal, TriangleAlert, X } from 'lucide-react'
import type { TenderListParams } from '@/api/types'

type SortField = 'discovered_at' | 'unified_score' | 'budget' | 'deadline'
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

const SORT_FIELDS: SortField[] = ['discovered_at', 'unified_score', 'budget', 'deadline']

type ScoreType = 'unified' | 'interestingness' | 'relevance'

const SCORE_DOT_COLORS: Record<ScoreType, string> = {
  unified: 'bg-blue-500',
  interestingness: 'bg-amber-500',
  relevance: 'bg-gray-400',
}

const SCORE_TYPE_LABELS: Record<ScoreType, string> = {
  unified: 'Unified score',
  interestingness: 'Interestingness score (unified not available)',
  relevance: 'Legacy relevance score',
}

function getDisplayScore(t: { unified_score: number | null; interestingness_score: number | null; relevance_score: number | null }): { score: number | null; type: ScoreType } {
  if (t.unified_score != null) return { score: t.unified_score, type: 'unified' }
  if (t.interestingness_score != null) return { score: t.interestingness_score, type: 'interestingness' }
  if (t.relevance_score != null) return { score: t.relevance_score, type: 'relevance' }
  return { score: null, type: 'relevance' }
}

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
  const analyzedParam = searchParams.get('analyzed') ?? 'true'
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

  // --- Local search state (debounce defined after updateFilters) ---
  const [searchValue, setSearchValue] = useState(q)

  // Period popover open state. Controlled so we can keep it open while the
  // native date picker (which renders in an OS-level layer outside the popover
  // DOM) is being used — otherwise base-ui treats month-arrow clicks as an
  // outside interaction and closes the popover.
  const [periodOpen, setPeriodOpen] = useState(false)

  // Draft date range, edited inside the popover. Presets and the From/To inputs
  // write to this draft only; nothing touches the active URL filters until the
  // user presses Apply. This keeps a single, consistent mental model (pick,
  // then Apply) and avoids partial ranges filtering the table mid-selection.
  const [draftFrom, setDraftFrom] = useState('')
  const [draftTo, setDraftTo] = useState('')

  useEffect(() => {
    setSearchValue(q)
  }, [q])

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

  // --- Search debounce ---
  useEffect(() => {
    if (searchValue === q) return
    const timer = setTimeout(() => {
      updateFilters({ q: searchValue })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchValue]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // --- Period popover handlers ---
  // Presets fill the draft From/To fields; they do NOT apply or close.
  function handleDatePreset(presetLabel: string | null) {
    if (presetLabel === '__clear__') {
      setDraftFrom('')
      setDraftTo('')
      return
    }
    const preset = DATE_PRESETS.find((p) => p.label === presetLabel)
    if (!preset) return
    const range = preset.getRange()
    setDraftFrom(range.from)
    setDraftTo(range.to)
  }

  // Sync the draft from the active filters whenever the popover opens, then open.
  function openPeriodPopover() {
    setDraftFrom(discoveredFrom)
    setDraftTo(discoveredTo)
    setPeriodOpen(true)
  }

  // Commit the draft range to the URL filters and close.
  function applyPeriod() {
    updateFilters({ discovered_from: draftFrom, discovered_to: draftTo })
    setPeriodOpen(false)
  }

  // Reset the draft to empty (Apply still required to commit "All dates").
  function clearPeriodDraft() {
    setDraftFrom('')
    setDraftTo('')
  }

  // Which preset the DRAFT currently matches (drives the in-popover Select).
  const draftPreset = useMemo(() => {
    if (!draftFrom && !draftTo) return '__clear__'
    const match = DATE_PRESETS.find((p) => {
      const range = p.getRange()
      return range.from === draftFrom && range.to === draftTo
    })
    return match?.label ?? '__custom__'
  }, [draftFrom, draftTo])

  // Which preset the ACTIVE (committed) range matches — drives the trigger label.
  const discoveredPreset = useMemo(() => {
    if (!discoveredFrom && !discoveredTo) return '__clear__'
    const match = DATE_PRESETS.find((p) => {
      const range = p.getRange()
      return range.from === discoveredFrom && range.to === discoveredTo
    })
    return match?.label ?? '__custom__'
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

  // --- Active filters detection (analyzed='true' is the default, not considered active) ---
  const hasActiveFilters = status !== '' || sourceId !== '' || discoveredFrom !== '' || discoveredTo !== '' || (analyzedParam !== 'true' && analyzedParam !== '') || q !== '' || minInterestingness !== ''

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
      <PageHeader
        title="Tenders"
        description="Browse and filter discovered tenders, review relevance scores and analysis results."
      />

      {/* Filter bar — single row */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search tenders..."
            maxLength={200}
            className="pl-9 h-8"
          />
        </div>

        {/* Period popover */}
        <Popover
          open={periodOpen}
          onOpenChange={(open, details) => {
            // Keep the popover open when a native date picker steals focus.
            // The browser's date calendar renders outside the popover DOM, so
            // interacting with it fires an 'outside-press'/'focus-out' close
            // while the date <input> is still the focused element.
            if (
              !open &&
              (details.reason === 'outside-press' || details.reason === 'focus-out') &&
              document.activeElement instanceof HTMLInputElement &&
              document.activeElement.type === 'date' &&
              document.activeElement.closest('[data-slot="popover-content"]')
            ) {
              details.cancel()
              return
            }
            if (open) openPeriodPopover()
            else setPeriodOpen(false)
          }}
        >
          <PopoverTrigger className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 h-8 text-sm whitespace-nowrap transition-colors hover:bg-muted data-[popup-open]:border-ring data-[popup-open]:ring-3 data-[popup-open]:ring-ring/50">
            <CalendarDays className="size-3.5 text-muted-foreground" />
            <span>{discoveredPreset === '__clear__' ? 'Period' : discoveredPreset === '__custom__' ? 'Custom range' : discoveredPreset}</span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-3">
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Preset</span>
                <Select
                  value={draftPreset}
                  onValueChange={handleDatePreset}
                  items={[
                    { value: '__clear__', label: 'All dates' },
                    { value: '__custom__', label: 'Custom range' },
                    ...DATE_PRESETS.map((p) => ({ value: p.label, label: p.label })),
                  ]}
                >
                  <SelectTrigger className="w-full">
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

              <div className="border-t border-border" />

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Custom range</span>
                <div className="flex items-center gap-2">
                  <label className="flex flex-col gap-1 flex-1">
                    <span className="text-xs text-muted-foreground">From</span>
                    <input
                      type="date"
                      value={draftFrom}
                      max={draftTo || undefined}
                      onChange={(e) => setDraftFrom(e.target.value)}
                      className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </label>
                  <label className="flex flex-col gap-1 flex-1">
                    <span className="text-xs text-muted-foreground">To</span>
                    <input
                      type="date"
                      value={draftTo}
                      min={draftFrom || undefined}
                      onChange={(e) => setDraftTo(e.target.value)}
                      className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearPeriodDraft}
                  disabled={!draftFrom && !draftTo}
                >
                  Clear
                </Button>
                <Button size="sm" onClick={applyPeriod}>
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Status select */}
        <Select
          value={status || '__all__'}
          onValueChange={(v) => updateFilters({ status: v === '__all__' ? '' : v ?? '' })}
          items={STATUS_OPTIONS.map((opt) => ({
            value: opt.value || '__all__',
            label: opt.label,
          }))}
        >
          <SelectTrigger className="min-w-[120px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || '__all__'} value={opt.value || '__all__'}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Min Score select */}
        <Select
          value={minInterestingness || '__all__'}
          onValueChange={(v) => updateFilters({ min_interestingness: v === '__all__' ? '' : v ?? '' })}
          items={[
            { value: '__all__', label: 'Min score' },
            ...Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}+` })),
          ]}
        >
          <SelectTrigger className="min-w-[100px]">
            <SelectValue placeholder="Min score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Min score</SelectItem>
            {Array.from({ length: 10 }, (_, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}+</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* More filters popover */}
        <Popover>
          <PopoverTrigger className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 h-8 text-sm whitespace-nowrap transition-colors hover:bg-muted data-[popup-open]:border-ring data-[popup-open]:ring-3 data-[popup-open]:ring-ring/50">
            <SlidersHorizontal className="size-3.5 text-muted-foreground" />
            <span>More</span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-3">
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Source</span>
                <Select
                  value={sourceId || '__all__'}
                  onValueChange={(v) => updateFilters({ source_id: v === '__all__' ? '' : v ?? '' })}
                  items={[
                    { value: '__all__', label: 'All sources' },
                    ...(sources?.map((s) => ({ value: s.source_id, label: s.source_id })) ?? []),
                  ]}
                >
                  <SelectTrigger className="w-full">
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
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Analysis</span>
                <Select
                  value={analyzedDisplay}
                  onValueChange={(v) => {
                    updateFilters({ analyzed: v === 'analyzed' ? 'true' : v === 'unanalyzed' ? 'false' : 'all' })
                  }}
                  items={[
                    { value: 'all', label: 'All tenders' },
                    { value: 'analyzed', label: 'Analyzed only' },
                    { value: 'unanalyzed', label: 'Unanalyzed only' },
                  ]}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All tenders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tenders</SelectItem>
                    <SelectItem value="analyzed">Analyzed only</SelectItem>
                    <SelectItem value="unanalyzed">Unanalyzed only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => navigate('/tenders')}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3" />
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-[45%] px-4 py-3 text-left font-medium">Title</th>
              <th
                className={cn("w-[12%] px-4 py-3 text-left font-medium select-none", q ? "opacity-50 cursor-default" : "cursor-pointer")}
                onClick={q ? undefined : () => handleSort('unified_score')}
                aria-sort={getAriaSort('unified_score', sortBy, sortDirection)}
              >
                Score{sortIndicator('unified_score')}
              </th>
              <th
                className={cn("w-[14%] px-4 py-3 text-right font-medium select-none", q ? "opacity-50 cursor-default" : "cursor-pointer")}
                onClick={q ? undefined : () => handleSort('budget')}
                aria-sort={getAriaSort('budget', sortBy, sortDirection)}
              >
                Budget{sortIndicator('budget')}
              </th>
              <th
                className={cn("w-[14%] px-4 py-3 text-left font-medium select-none", q ? "opacity-50 cursor-default" : "cursor-pointer")}
                onClick={q ? undefined : () => handleSort('deadline')}
                aria-sort={getAriaSort('deadline', sortBy, sortDirection)}
              >
                Deadline{sortIndicator('deadline')}
              </th>
              <th
                className={cn("w-[15%] px-4 py-3 text-left font-medium select-none", q ? "opacity-50 cursor-default" : "cursor-pointer")}
                onClick={q ? undefined : () => handleSort('discovered_at')}
                aria-sort={getAriaSort('discovered_at', sortBy, sortDirection)}
              >
                Discovered{sortIndicator('discovered_at')}
              </th>
            </tr>
          </thead>
          <tbody>
            {tenders.map((t) => {
              const { score, type } = getDisplayScore(t)
              return (
                <tr
                  key={`${t.source_id}-${t.tender_id}`}
                  onClick={() => {
                    if (t.status === 'skipped') {
                      window.open(`https://www.developmentaid.org/tenders/view/${t.tender_id}`, '_blank')
                    } else {
                      navigate(`/tenders/${t.source_id}/${t.tender_id}`)
                    }
                  }}
                  className="cursor-pointer border-b transition-colors even:bg-muted/30 hover:bg-muted/50"
                >
                  <td className="px-4 py-2.5">
                    <div className="min-w-0">
                      <span className="truncate block font-medium" title={t.title}>{t.title}</span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {[t.organization, t.location_names].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {score !== null ? (
                      <Tooltip>
                        <TooltipTrigger className="inline-flex items-center gap-1.5">
                          <span className={cn('size-2 rounded-full', SCORE_DOT_COLORS[type])} />
                          <span className="font-medium tabular-nums">{formatScore(score)}</span>
                        </TooltipTrigger>
                        <TooltipContent>{SCORE_TYPE_LABELS[type]}</TooltipContent>
                      </Tooltip>
                    ) : t.status === 'skipped' ? (
                      t.skip_reason ? (
                        <Tooltip>
                          <TooltipTrigger className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <CircleSlash className="size-3.5" />
                            <span className="text-xs">Skipped</span>
                            <ExternalLink className="size-3" />
                          </TooltipTrigger>
                          <TooltipContent>{t.skip_reason}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <CircleSlash className="size-3.5" />
                          <span className="text-xs">Skipped</span>
                          <ExternalLink className="size-3" />
                        </span>
                      )
                    ) : t.status === 'failed' || t.status === 'permanently_failed' ? (
                      <Tooltip>
                        <TooltipTrigger className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <TriangleAlert className="size-3.5" />
                          <span className="text-xs">Failed</span>
                        </TooltipTrigger>
                        <TooltipContent>Tender detail fetch failed</TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="size-3.5" />
                          <span className="text-xs">Pending</span>
                        </TooltipTrigger>
                        <TooltipContent>{t.status === 'completed' ? 'Waiting for analysis' : 'Waiting for detail fetch'}</TooltipContent>
                      </Tooltip>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">{formatBudget(t.budget)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{t.deadline ?? '—'}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{t.discovered_at.slice(0, 10)}</td>
                </tr>
              )
            })}
            {tenders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
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
