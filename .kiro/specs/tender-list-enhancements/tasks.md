# Implementation Plan: Tender List Enhancements

## Overview

Add full-text search, interestingness and unified score columns, and a minimum interestingness filter to the tender list page. All changes build on existing URL-driven state patterns, TanStack Query hooks, and the ScoreBadge component.

## Tasks

- [x] 1. Extend types and utility functions
  - [x] 1.1 Add `interestingness_score` and `unified_score` fields to `TenderListItem`, and `q` and `min_interestingness` fields to `TenderListParams` in `src/api/types.ts`
    - `interestingness_score: number | null`
    - `unified_score: number | null`
    - `q?: string`
    - `min_interestingness?: string`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 1.2 Add `getInterestingnessScoreBadgeColor` and `getUnifiedScoreBadgeColor` functions to `src/utils/formatting.ts`
    - `getInterestingnessScoreBadgeColor`: null → gray/"—", 0 → gray/"Filtered", ≥7 → green, ≥4 → yellow, <4 → red (integer label)
    - `getUnifiedScoreBadgeColor`: null → gray/"—", 0 → gray/"Filtered", ≥7.0 → green, ≥4.0 → yellow, <4.0 → red (1 decimal label)
    - _Requirements: 3.2, 3.3, 4.2, 4.3_

- [x] 2. Create SearchInput component
  - [x] 2.1 Create `src/components/SearchInput.tsx` with debounced text input
    - Props: `value: string`, `onChange: (value: string) => void`, `debounceMs?: number` (default 300)
    - Internal `useState` for immediate display, `useEffect` + `setTimeout` for debounce
    - Sync from `value` prop on external change (browser back)
    - `maxLength={200}` on input element
    - _Requirements: 1.1, 1.2, 1.6_

- [x] 3. Integrate search, filter, and score columns into TenderListPage
  - [x] 3.1 Add search bar and min interestingness filter to `src/pages/TenderListPage.tsx`
    - Read `q` and `min_interestingness` from URL search params
    - Render `SearchInput` above the table, wired to `updateFilters` for `q` param
    - Add Min Interestingness dropdown (options: "All", "1+", "2+", … "10+") in the filter bar
    - Validate `min_interestingness` on load: invalid values → remove param, show "All"
    - Reset pagination to page 1 when `q` or `min_interestingness` changes
    - _Requirements: 1.1, 1.3, 1.6, 1.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 3.2 Add Interestingness and Unified score columns to the table
    - Widen `SortField` type to include `'interestingness_score' | 'unified_score'`
    - Add both to `SORT_FIELDS` array
    - Add column headers with sort controls (click-to-toggle, aria-sort, sort indicator)
    - Render `ScoreBadge` using `getInterestingnessScoreBadgeColor` and `getUnifiedScoreBadgeColor`
    - Position after existing Relevance Score column
    - Adjust column widths to accommodate new columns
    - _Requirements: 3.1, 3.4, 3.5, 3.6, 4.1, 4.4_

  - [x] 3.3 Implement sort-search interaction logic
    - When `q` is non-empty: omit `sort_by`/`sort_direction` from API params, disable sort controls (opacity-50, cursor-default, no click handler), preserve sort URL params
    - When `q` is cleared: re-enable sort controls, re-apply preserved sort params to fetch
    - _Requirements: 1.4, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 3.4 Implement search-specific empty state
    - When `q` is non-empty and items is empty: show "No tenders match your search" + "Clear search" button
    - "Clear search" removes only `q` param, preserves all other filters
    - When `q` is empty and items is empty: show existing "No tenders found" message
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Checkpoint - Build verification
  - Run `npm run build` to ensure TypeScript compiles with zero errors
  - _Requirements: 6.5, 6.6_

- [x] 5. Playwright e2e tests
  - [x] 5.1 Write Playwright tests covering the key user flows
    - Search: type a query, verify results filter, clear search restores list
    - Sort disabled during search: verify sort headers non-interactive when q is active
    - Min interestingness filter: select threshold, verify results update
    - Score columns: verify interestingness and unified scores render (including null → "—")
    - Empty state: search for nonsense term, verify "No tenders match your search" + clear button
    - _Requirements: 1.1–1.7, 2.1–2.4, 3.1–3.3, 4.1–4.3, 5.1–5.5, 7.1–7.5_

## Notes

- Minimal test footprint: no unit/property tests — product is evolving fast
- Playwright e2e tests validate critical user flows against the real UI
- Each task references specific requirements for traceability
- The design uses TypeScript throughout
- All changes confined to: `src/api/types.ts`, `src/utils/formatting.ts`, `src/components/SearchInput.tsx`, `src/pages/TenderListPage.tsx`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1", "3.2"] },
    { "id": 3, "tasks": ["3.3", "3.4"] },
    { "id": 4, "tasks": ["4"] },
    { "id": 5, "tasks": ["5.1"] }
  ]
}
```
