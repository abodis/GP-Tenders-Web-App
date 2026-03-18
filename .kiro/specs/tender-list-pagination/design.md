# Design: Tender List Pagination & Filtering Overhaul

Requirements: #[[file:.kiro/specs/tender-list-pagination/requirements.md]]
API Reference: #[[file:docs/api-outline.md]]
Current Implementation: #[[file:src/pages/TenderListPage.tsx]]

## Architecture Overview

Switch from `useInfiniteQuery` (accumulating pages) to `useQuery` (single page fetch). All state moves from `useState` to URL search params via `useSearchParams`. The API handles all filtering, sorting, and pagination server-side.

```
URL Search Params ──→ useTenders(params) ──→ useQuery ──→ GET /tenders?...
       ↑                                                        │
       │                                                        ↓
  User interaction                                    { items, total_count, next_cursor }
  (filter, sort, page)                                          │
       ↑                                                        ↓
       └──────────── TenderListPage renders ←───────────────────┘
```

## File Changes

### 1. `src/api/types.ts` — Type Updates
- Add `total_count: number | null` to `PaginatedResponse<T>`
- Add `sort_direction?: string` to `TenderListParams`
- Add `currency: string | null` to `TenderListItem`

### 2. `src/hooks/useTenders.ts` — Hook Rewrite
- Replace `useInfiniteQuery` with `useQuery`
- Accept full `TenderListParams` (including cursor)
- Return `PaginatedResponse<TenderListItem>` directly (no page flattening)

```typescript
export function useTenders(params?: TenderListParams) {
  return useQuery({
    queryKey: ['tenders', params],
    queryFn: () => getTenders(params),
  })
}
```

### 3. `src/pages/TenderListPage.tsx` — Major Rewrite

#### URL State Management
Read all state from `useSearchParams`:
- `status`, `source_id`, `discovered_from`, `discovered_to`, `analyzed` — filters
- `sort_by`, `sort_direction` — sorting
- `cursor` — current page position

Helper to update params: sets new values, removes empty strings, resets cursor when filters/sort change.

#### Pagination Logic
- Compute `totalPages = Math.ceil(total_count / page_size)`
- Track page number client-side (derived from navigation sequence since cursors are opaque)
- Store `page` in URL params alongside `cursor` for display purposes
- "Previous" uses a cursor stack (push on next, pop on previous)
- Page number buttons: show first, last, and window around current page

#### Date Presets
- Dropdown above or inline with the date inputs
- Each preset computes `discovered_from` and `discovered_to` ISO date strings
- Presets defined as a constant array:

```typescript
const DATE_PRESETS = [
  { label: 'Today', getRange: () => { const d = today(); return { from: d, to: d } } },
  { label: 'Last 7 days', getRange: () => ({ from: daysAgo(7), to: today() }) },
  { label: 'Last 30 days', getRange: () => ({ from: daysAgo(30), to: today() }) },
  { label: 'This week', getRange: () => ({ from: startOfWeek(), to: endOfWeek() }) },
  { label: 'This month', getRange: () => ({ from: startOfMonth(), to: endOfMonth() }) },
  { label: 'Last month', getRange: () => ({ from: startOfLastMonth(), to: endOfLastMonth() }) },
] as const
```

#### Sort Handling
- All four sort fields go server-side: `discovered_at` (default/no sort_by), `relevance_score`, `budget`, `deadline`
- Clicking column header updates `sort_by` + `sort_direction` in URL params
- Resets cursor (back to page 1)

### 4. `src/utils/date-presets.ts` — New Utility
Pure functions for date preset calculations:
- `today()`, `daysAgo(n)`, `startOfWeek()`, `endOfWeek()`, `startOfMonth()`, `endOfMonth()`, `startOfLastMonth()`, `endOfLastMonth()`
- All return ISO date strings (`YYYY-MM-DD`)
- Week starts on Monday (ISO standard)

### 5. `src/components/Pagination.tsx` — New Component
Reusable pagination component:
- Props: `currentPage`, `totalPages`, `onPageChange`, `hasNextPage`, `hasPreviousPage`
- Renders: Previous button, page number buttons (with ellipsis), Next button
- Shows "Showing X–Y of Z" summary
- Uses `nav` element with `aria-label="Pagination"`

## Cursor Stack Strategy

Since the API uses opaque cursors, we can't jump to arbitrary pages. Strategy:

1. Maintain a `cursors` array in component state: `[undefined, 'cursor_page2', 'cursor_page3', ...]`
2. Index 0 = page 1 (no cursor needed)
3. When fetching page N, the response's `next_cursor` becomes `cursors[N]`
4. "Previous" = use `cursors[currentPage - 2]`
5. "Next" = use `cursors[currentPage]` (set from last response's `next_cursor`)
6. Page number click = use `cursors[pageNum - 1]` (only works for already-visited pages)
7. Unvisited pages shown as disabled in the pagination UI
8. Changing filters/sort clears the cursor stack

URL stores `page` (number) + `cursor` (string). When loading from a shared URL with a cursor, we start from that point — the user sees the correct page but can only navigate forward or back to page 1 (cursor stack is empty for intermediate pages). This is an acceptable tradeoff.

## Component Tree

```
TenderListPage
├── Filter Bar
│   ├── Status select
│   ├── Source select
│   ├── Date preset dropdown
│   ├── From date input
│   └── To date input
│   └── Analyzed select
├── Results summary ("Showing 1–20 of 347 tenders")
├── Table (same columns, all sortable)
│   ├── Title
│   ├── Organization
│   ├── Status
│   ├── Score (sortable)
│   ├── Budget (sortable)
│   ├── Deadline (sortable)
│   ├── Location
│   ├── Source
│   └── Discovered (sortable, default)
└── Pagination
    ├── Previous button
    ├── Page numbers (with ellipsis)
    └── Next button
```
