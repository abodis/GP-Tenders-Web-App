# Tender List Enhancements Brainstorm

Date: 2026-07-21
Phase: 2 (per `frontend-v2-implementation-order.md`)
Tracks: `docs/frontend-v2-requirements.md` §1

## What We're Building

Add full-text search, two new score columns (interestingness + unified), and a min_interestingness filter to the existing tender list page.

## Core Problem

Users can't search tenders by text, can't see interestingness/unified scores at a glance, and can't filter by interestingness threshold. These are key discovery tools for evaluating which tenders deserve attention.

## Key Decisions Made

| # | Decision | Choice | Confidence |
|---|----------|--------|-----------|
| 1 | Build with nullable data | Yes — "—" for null scores | 🟢 80% |
| 2 | Search UX | Debounced (300ms) text input, URL-driven (`?q=`) | 🟢 80% |
| 3 | Score columns | All three: relevance (int badge), interestingness (int badge), unified (1-decimal float) | 🟢 70% |
| 4 | Pagination | Keep page-based, no migration | 🟢 75% |
| 5 | New sort fields | Both `interestingness_score` and `unified_score` sortable | 🟢 85% |
| 6 | Search + sort interaction | Disable sort controls when `q` is non-empty; don't send sort params | 🟢 80% |
| 7 | Search empty state | Dedicated "No tenders match your search" message with clear button | 🟢 75% |
| 8 | min_interestingness UI | Select dropdown with values 1–10 (e.g. "5+") | 🟢 70% |
| 9 | unified_score display | Numeric text, 1 decimal place, subtle badge/pill | 🟢 70% |

## Constraints Discovered

- `interestingness_score`: integer 1–10, nullable. Most tenders currently null (pipeline still scoring).
- `unified_score`: float (observed range ~0.9–4.4), nullable. Presumably 0–10 scale.
- Backend rejects sort on fields not in allowed list — verified all 5 sort fields work locally: `discovered_at`, `relevance_score`, `budget`, `deadline`, `interestingness_score`, `unified_score`.
- When `q` is used, backend ranks by search relevance — sort params should not be sent.
- `min_interestingness` filter: integer 1–10 range. Returns 0 results when no tenders meet threshold.
- Full-text search matches title, description, organization, sectors.

## Integration Points

- `TenderListParams` type: add `q`, `min_interestingness` fields
- `TenderListItem` type: add `interestingness_score: number | null`, `unified_score: number | null`
- `SORT_FIELDS` array in TenderListPage: add `interestingness_score`, `unified_score`
- Existing `ScoreBadge` component: reuse for interestingness (integer), new display variant for unified (float)
- URL search params: add `q`, `min_interestingness` to the param-reading logic
- `updateFilters` helper: works as-is for new params

## Verification Plan

1. Type check: `npm run build` passes with new types
2. Unit tests: new params included in query key, debounce works, sort disabled when q present
3. Manual verification against local API:
   - Search "biodiversity" → filtered results, clear button resets
   - Sort by interestingness_score desc → correct order
   - Sort by unified_score desc → correct order
   - min_interestingness=4 → only 2 results (current data)
   - q + sort controls visually disabled
   - Null scores show "—"
   - Empty search result shows dedicated message

## Open Questions

- [ ] What is the actual 0–10 range of `unified_score`? Current data maxes at ~4.4. May need to revisit color/badge scaling once more data exists.
- [ ] Should we show a "search is active" indicator somewhere prominent (e.g. chip/tag above results)?

## Implementation Scope (spec-sized units)

Single spec covering:
1. Type updates (`TenderListParams`, `TenderListItem`)
2. Search bar component (debounced input, URL sync)
3. min_interestingness filter (Select dropdown)
4. Two new score columns in table
5. Sort field additions + disable-when-searching logic
6. Search-specific empty state

All changes confined to: `src/api/types.ts`, `src/pages/TenderListPage.tsx`, possibly a new `SearchInput` component if extracted.

## Next Steps

1. Create spec from this brainstorm
2. Implement in single pass — all changes are in one page + types
