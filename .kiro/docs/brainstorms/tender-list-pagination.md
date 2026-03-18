# Tender List Page — Pagination & Filtering Brainstorm

## What We're Building
Reworking the tender list page to replace "Load more" with proper page-based pagination (deep-linkable URLs), move filtering and sorting to be fully server-side, and add date range presets.

## Key Constraints
1. API uses cursor-based pagination (opaque base64 tokens) — no offset/page param
2. Server-side sort only supports `relevance_score` and default `discovered_at` desc
3. Server-side filtering already supports: status, source_id, discovered_from/to, analyzed, min_score, tender_type, fully_visible
4. `page_size` configurable 1–100

## Key Decisions Made

### 1. Pagination Model
**Choice:** Cursor-based pages with URL state (🟢 75%)
- Keep cursor pagination under the hood, present as pages in UI
- Store page_size + cursor in URL search params
- "Previous / Next" buttons (not page numbers)
- Each page = 1 API call, filters apply server-side across full dataset
- Tradeoff: no "jump to page N", but sequential nav with good filters is the natural workflow

### 2. URL State Management
**Choice:** `useSearchParams` from React Router (🟢 85%)
- All filter/sort/pagination state in URL search params
- Deep-linkable, browser back/forward works
- Direct usage in page component (no abstraction layer yet)

### 3. Sorting
**Choice:** Server-side only for supported fields (🟢 70%)
- Only offer `discovered_at` (default) and `relevance_score`
- Remove `budget` and `deadline` sort (can't be done server-side)
- Future: request backend to add sort support for those fields

### 4. Date Range Presets
**Choice:** Preset dropdown alongside date inputs (🟢 80%)
- Dropdown with: Today, Last 7 days, Last 30 days, This week, This month, Last month
- Selecting a preset fills From/To inputs; user can still adjust manually

### 5. Filtering Behavior
**Choice:** All filters → URL params → fresh `useQuery` per page (🟢 85%)
- Switch from `useInfiniteQuery` to `useQuery` (single page fetch)
- Changing any filter resets cursor (back to page 1)
- Filters always apply to full dataset

## Integration Points
- `src/hooks/useTenders.ts` — Replace `useInfiniteQuery` with `useQuery`
- `src/pages/TenderListPage.tsx` — Major rewrite: URL state, pagination controls, date presets
- `src/utils/sorting.ts` — `sortTendersClientSide` no longer needed here
- `src/components/LoadMoreButton.tsx` — No longer used by this page

## Resolved Questions
- Date presets: Today, Last 7 days, Last 30 days, This week, This month, Last month
- Page size default: 20
- Budget/deadline sort: Remove from frontend now; backend will add `sort_by=budget` and `sort_by=deadline`
- Total count: Backend will add `total_count` to response envelope → enables "Page X of Y" navigation

## Backend API Changes Required (before frontend implementation)

### 1. `sort_by` expansion
- Accept `budget` and `deadline` in addition to `relevance_score`
- Add `sort_direction` param (`asc`/`desc`, default `desc`) for all sort fields
- Budget: numeric sort, treat 0 as null → sort last
- Deadline: ISO date sort, nulls sort last

### 2. `total_count` in response envelope
```json
{ "items": [...], "count": 20, "total_count": 347, "next_cursor": "..." }
```
- Total items matching current filters (before pagination)
- Separate DynamoDB COUNT query with same filter expression

## Next Steps
1. Backend implements sort_by expansion + total_count
2. Create spec from this brainstorm
3. Frontend implementation: hook + page component (moderate scope)
