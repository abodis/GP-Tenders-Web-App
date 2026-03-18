# Tasks: Tender List Pagination & Filtering Overhaul

Design: #[[file:.kiro/specs/tender-list-pagination/design.md]]
Requirements: #[[file:.kiro/specs/tender-list-pagination/requirements.md]]

## Task 1: Update API types
- [x] Add `total_count: number | null` to `PaginatedResponse<T>` in `src/api/types.ts`
- [x] Add `sort_direction?: string` to `TenderListParams`
- [x] Add `currency: string | null` to `TenderListItem`
- [x] Verify no type errors with `npm run lint`

## Task 2: Rewrite `useTenders` hook
- [x] Replace `useInfiniteQuery` with `useQuery` in `src/hooks/useTenders.ts`
- [x] Accept full `TenderListParams` (including `cursor`)
- [x] Return `PaginatedResponse<TenderListItem>` directly
- [x] Query key: `['tenders', params]`

## Task 3: Create date preset utility
- [x] Create `src/utils/date-presets.ts` with pure functions: `today()`, `daysAgo(n)`, `startOfWeek()`, `endOfWeek()`, `startOfMonth()`, `endOfMonth()`, `startOfLastMonth()`, `endOfLastMonth()`
- [x] All return ISO date strings (`YYYY-MM-DD`)
- [x] Week starts on Monday
- [x] Export `DATE_PRESETS` array with label + getRange pairs

## Task 4: Create Pagination component
- [x] Create `src/components/Pagination.tsx`
- [x] Props: `currentPage`, `totalPages`, `onPageChange(page)`, `hasNextPage`, `hasPreviousPage`
- [x] Render Previous/Next buttons + page number buttons with ellipsis for large ranges
- [x] Show "Showing X–Y of Z tenders" summary (props: `from`, `to`, `total`)
- [x] Use `<nav aria-label="Pagination">` wrapper
- [x] `aria-current="page"` on active page button
- [x] Disabled state for Previous (page 1) and Next (last page)

## Task 5: Rewrite TenderListPage
- [x] Replace all `useState` filter/sort state with `useSearchParams`
- [x] Read params on mount: `status`, `source_id`, `discovered_from`, `discovered_to`, `analyzed`, `sort_by`, `sort_direction`, `cursor`, `page`
- [x] Build `TenderListParams` from URL params and pass to `useTenders`
- [x] Implement cursor stack for page navigation (array in component state)
- [x] Helper function to update URL params: resets `cursor` and `page` when filters/sort change
- [x] Wire up sort column headers to update `sort_by` + `sort_direction` in URL
- [x] Add date preset dropdown that populates `discovered_from` and `discovered_to`
- [x] Replace `<LoadMoreButton>` with `<Pagination>` component
- [x] Add results summary above table
- [x] Remove `sortTendersClientSide` import and client-side sort logic
- [x] All four sort fields: discovered_at, relevance_score, budget, deadline

## Task 6: Verify and clean up
- [x] Run `npm run lint` — no errors
- [x] Run `npm run build` — builds successfully
- [x] Manual smoke test: filters update URL, sharing URL reproduces view, sort works across full dataset, date presets populate dates, pagination navigates correctly
- [x] Remove unused imports (`useInfiniteQuery` if no other consumers, `LoadMoreButton` if no other consumers)
