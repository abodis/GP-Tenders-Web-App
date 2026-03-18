# Requirements: Tender List Pagination & Filtering Overhaul

Brainstorm: #[[file:.kiro/docs/brainstorms/tender-list-pagination.md]]
API Reference: #[[file:docs/api-outline.md]]

## Background
The tender list page currently uses infinite scroll ("Load more") with client-side filtering and sorting. This creates several UX problems:
- Filters only apply to loaded data, not the full dataset
- Sorting on budget/deadline only works within loaded pages
- No deep-linkable URLs — can't share a specific filtered/sorted view
- No sense of total results or position within the dataset

## Functional Requirements

### REQ-1: Page-Based Pagination
- Replace "Load more" infinite scroll with numbered page navigation
- Show page numbers derived from `total_count` / `page_size`
- Support Previous/Next and direct page number clicks
- Default page size: 20
- Show "Showing X–Y of Z tenders" summary

### REQ-2: URL-Driven State
- All filter, sort, and pagination state stored in URL search params
- Changing any filter resets to page 1
- Deep-linkable: sharing a URL reproduces the exact same view
- Browser back/forward navigates between previous filter/page states
- URL params: `status`, `source_id`, `discovered_from`, `discovered_to`, `analyzed`, `sort_by`, `sort_direction`, `page_size`, `cursor`

### REQ-3: Server-Side Sorting
- Sortable columns: Discovered (default), Score, Budget, Deadline
- All sorting handled server-side via `sort_by` + `sort_direction` params
- Remove client-side sorting logic (`sortTendersClientSide` no longer used here)
- Clicking a column header toggles direction; clicking a different column switches to it with desc default
- Visual sort indicator (arrow) on active column

### REQ-4: Server-Side Filtering
- All existing filters (status, source, date range, analyzed) sent as API query params
- Filters apply to the full dataset, not just loaded pages
- Changing any filter resets pagination to page 1

### REQ-5: Date Range Presets
- Add a preset dropdown alongside the From/To date inputs
- Presets: Today, Last 7 days, Last 30 days, This week (Mon–Sun), This month, Last month
- Selecting a preset populates the From and To date inputs
- User can still manually adjust dates after selecting a preset
- Selecting "Custom" (or clearing) removes preset and keeps manual dates

### REQ-6: Updated API Types
- Add `total_count: number | null` to `PaginatedResponse<T>`
- Add `sort_direction` to `TenderListParams`
- Add `currency: string | null` to `TenderListItem`

## Non-Functional Requirements

### NFR-1: Performance
- Each page view = single API call (no accumulating pages in memory)
- Query key includes all params so TanStack Query caches each unique view

### NFR-2: Accessibility
- Pagination controls use proper `nav` landmark with `aria-label`
- Current page indicated with `aria-current="page"`
- Sort direction communicated via `aria-sort` on table headers
- Date preset dropdown is keyboard-navigable

## Out of Scope
- Page size selector (fixed at 20 for now)
- Persisting filter preferences across sessions (localStorage)
- Advanced filters (min_score, tender_type, fully_visible) — can be added later
