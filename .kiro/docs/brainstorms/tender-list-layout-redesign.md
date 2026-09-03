# Tender List Layout Redesign

## What We're Building
Reduce information density on the tender list page by consolidating score columns, compressing filters into a single row, and adopting a two-line row layout with progressive disclosure.

## Core Problem
11-column table exceeds human scanning capacity (~4-5 attributes). Three score columns encode correlated info. Filters + search occupy 3 vertical zones before data appears. Desktop-only tool — no mobile concern.

## Key Decisions Made

- **Score consolidation**: Single "Score" column with fallback: unified_score → interestingness_score → relevance_score. Subtle indicator (icon/tooltip) shows which score type is displayed. (🟢 80%)
- **Column reduction**: 5 visible columns (Title, Score, Budget, Deadline, Discovered) + two-line row with org/location as subtitle. Drop Status, Source from table. (🟢 75%)
- **Filter compression**: Single row — `[Search...] [Period ▾] [Status ▾] [Min Score ▾] [More ▾] [Clear]`. Period popover contains preset + custom from/to. "More" groups: Source, Analysis. Min Interestingness promoted to top-level. (🟢 80%)
- **Page header**: Title + description on same line (flex row, items-baseline). Universal pattern across all pages. (🟢 85%)
- **Row style**: Two-line rows — title on line 1, org + location muted on line 2. Gives breathing room without hover dependency.
- **Sorting**: Only sortable by visible columns (unified/score, budget, deadline, discovered). Hidden fields lose sort capability.

## Constraints Discovered
- Old tenders lack unified_score and interestingness_score — fallback chain required
- Source column has zero entropy (only one source exists currently)
- Status column is low-entropy in normal browsing (mostly "completed")
- Desktop-only — no responsive/mobile breakpoints needed

## Target Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Tenders          Browse and filter discovered tenders...      │
├──────────────────────────────────────────────────────────────┤
│ [🔍 Search...         ] [Period ▾] [Status ▾] [Min ▾] [⋯] ⊗ │
├──────────────────────────────────────────────────────────────┤
│ Title                           Score  Budget  Deadline  Disc │
│ ──────────────────────────────────────────────────────────── │
│ 🔓 Environmental Impact Assess…  ● 8.2  €450K   15 Jul   3d │
│    UNDP · Romania                                             │
│ 🔒 Water Treatment Facility...   ● 6.1  €1.2M   22 Aug   1w │
│    World Bank · Moldova                                       │
└──────────────────────────────────────────────────────────────┘
```

## Score Column Behavior

| unified_score | interestingness_score | relevance_score | Displayed | Indicator |
|---|---|---|---|---|
| 8.2 | 7 | 6 | 8.2 | (none — primary score) |
| null | 7 | 6 | 7 | subtle icon: "interestingness" |
| null | null | 6 | 6 | subtle icon: "legacy relevance" |
| null | null | null | — | gray dash |

## Filter Bar Components

| Control | Type | Visible | Notes |
|---|---|---|---|
| Search | text input | always | flexible width, left-aligned |
| Period | popover | always | contains: preset dropdown + from/to date inputs |
| Status | select dropdown | always | All / Pending / Completed / Failed / etc. |
| Min Score | select dropdown | always | 1+ through 10+ (interestingness threshold) |
| More | popover | always | contains: Source, Analysis (analyzed/unanalyzed) |
| Clear | icon button | when filters active | resets all filters |

## Integration Points
- `src/pages/TenderListPage.tsx` — primary rewrite target
- `src/layouts/AppLayout.tsx` — no change (header is page-level)
- `src/components/` — new: `PageHeader`, `FilterBar`, `ScoreCell` (or inline)
- `src/utils/formatting.ts` — score fallback logic

## Verification Plan
- Build compiles without errors
- Table renders correctly with mix of old (no unified_score) and new tenders
- Score fallback shows correct value + indicator
- Filters work: period popover, status, min score, "more" popover
- Sort only on visible columns
- Two-line rows render org + location on second line
- Search on same row as filters

## Resolved Questions
- **Score indicator**: Colored dot next to the number. Dot color distinguishes score type (e.g. blue = unified, amber = interestingness, gray = legacy relevance). Tooltip on hover explains: "Interestingness score (unified not available)".
- **"More" popover**: Small card/panel dropping below the "More" button. Contains Source + Analysis selects stacked vertically. Light border, subtle shadow, dismiss on outside click.

## Next Steps
1. Implement PageHeader component (title + inline description) — apply to all pages
2. Redesign TenderListPage filter bar (single row with popovers)
3. Consolidate score columns + implement fallback logic
4. Convert table to two-line row layout with reduced columns
