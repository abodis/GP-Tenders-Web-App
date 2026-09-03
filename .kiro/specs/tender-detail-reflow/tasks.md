# Implementation Plan: Tender Detail Reflow

## Overview

Redesign the tender detail page from a flat 12-section layout into a verdict-first progressive disclosure page with state detection, tabbed match fitness, actions dropdown, and collapsible developer section. Implementation proceeds bottom-up: pure utilities first, then zone components, then page composition and cleanup of old components.

## Tasks

- [x] 1. Create pure utility functions and state classification
  - [x] 1.1 Create `src/utils/tender-state.ts` with `classifyTenderState`, `getScoreBadgeColor`, and `getFactorBarColor` functions
    - Implement `classifyTenderState(tender: TenderDetailResponse): TenderState` with precedence: skipped > fully_analyzed > legacy_analyzed > unanalyzed
    - Implement `getScoreBadgeColor(score: number | null): 'green' | 'yellow' | 'red' | 'gray'` with boundaries at 7.0, 4.0, and 0
    - Implement `getFactorBarColor(score: number): 'green' | 'yellow' | 'red'` with boundaries at 0.7 and 0.4
    - Export the `TenderState` type
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.3, 4.2, 4.4_

  - [x] 1.2 Add `humanizeTenderType` to `src/utils/format.ts`
    - Implement `humanizeTenderType(tenderType: string | null): string | null` — split on underscores, title-case each word, return null for null input
    - _Requirements: 6.5, 10.4_

  - [x] 1.3 Write property tests for `classifyTenderState` (Properties 1 and 2)
    - **Property 1: State classification is total and deterministic** — for any combination of nullable fields, function returns exactly one value from the TenderState set
    - **Property 2: skip_reason dominates all other classification fields** — when skip_reason is non-null, result is always 'skipped'
    - **Validates: Requirements 1.1, 1.2, 1.6**
    - Test file: `src/utils/tender-state.property.test.ts`

  - [x] 1.4 Write property tests for `getScoreBadgeColor` and `getFactorBarColor` (Properties 3 and 4)
    - **Property 3: Score badge color mapping respects range boundaries** — green ≥ 7.0, yellow ≥ 4.0, red > 0, gray for null/0
    - **Property 4: Factor bar color mapping respects range boundaries** — green ≥ 0.7, yellow ≥ 0.4, red < 0.4
    - **Validates: Requirements 3.3, 4.2, 4.4**
    - Test file: `src/utils/tender-state.property.test.ts`

  - [x] 1.5 Write property test for `humanizeTenderType` (Property 5)
    - **Property 5: Tender type humanization produces no underscores and title-cases each word** — for any non-null string, output contains no underscores and each word starts uppercase
    - **Validates: Requirements 6.5, 10.4**
    - Test file: `src/utils/format.property.test.ts`

- [x] 2. Implement presentational building blocks
  - [x] 2.1 Create `src/components/tender-detail/score-badge.tsx`
    - Render unified_score as large formatted number (1 decimal place) with color background from `getScoreBadgeColor`
    - Handle null (label "—"), zero (label "Filtered"), and numeric display cases
    - _Requirements: 3.3, 4.2, 4.3_

  - [x] 2.2 Create `src/components/tender-detail/factor-bar.tsx`
    - Render horizontal bar filled proportionally to 0–1 value, display as percentage (0–100%)
    - Color from `getFactorBarColor`; support binary mode for exclusion (green "Pass" / red "Excluded")
    - _Requirements: 4.4, 4.5_

  - [x] 2.3 Create `src/components/tender-detail/actions-dropdown.tsx`
    - Dropdown menu with 5 items: Extract Team Requirements, Run Team Match, Extract Reference Requirements, Run Reference Match, Check Exclusion Criteria
    - Use existing `useTenderActions` hook for mutations
    - Show spinner on active item, disable only that item during mutation, allow other items independently
    - Show inline error on failure, dismissible
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement zone components
  - [x] 4.1 Create `src/components/tender-detail/header-zone.tsx`
    - Title (truncated at 200 chars with ellipsis), organization (fallback "Unknown organization")
    - ScoreBadge component, deadline formatted "DD Mon YYYY" or "No deadline"
    - Location (omit if null), source link (new tab), tag pills (muted badges), feedback icon buttons (active state)
    - ActionsDropdown, tender_type via humanizeTenderType (omit if null)
    - Do NOT render `types` or `posted_date` fields
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 10.1, 10.2, 10.3, 10.4_

  - [x] 4.2 Create `src/components/tender-detail/verdict-zone.tsx`
    - Two-column layout: left = score + factor bars, right = AI summary cascade
    - Left: large unified_score (omit entirely if null/0), factor bars for team_match_score and reference_match_score, exclusion binary bar
    - Right: analysis_context as primary → analysis_summary below; fallback cascade to interestingness_reasoning → empty state
    - Omit factor bars when their data source is null
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12_

  - [x] 4.3 Create `src/components/tender-detail/match-fitness-tabs.tsx` and tab sub-components
    - Create `src/components/tender-detail/tabs/team-tab.tsx` — merged requirements + match view for fully_analyzed; legacy experts_required for legacy_analyzed; empty state when no data
    - Create `src/components/tender-detail/tabs/references-tab.tsx` — merged requirements + match for fully_analyzed; legacy references_required for legacy_analyzed; empty state when no data
    - Create `src/components/tender-detail/tabs/exclusion-tab.tsx` — exclusion criteria with assessment/confidence/category/reason for fully_analyzed; legacy turnover_required for legacy_analyzed; empty state when no data
    - MatchFitnessTabs parent: 3 tabs in fixed order (Team, References, Exclusion), Team selected by default, local state only
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [x] 4.4 Create `src/components/tender-detail/details-section.tsx`
    - Key facts: budget (with currency, "Not specified" for 0), tender_type (humanized), deadline, location
    - Description: collapsed with "View raw description" link when analysis_summary exists; expanded when no summary; hidden when description_text is null
    - "Show less" to re-collapse expanded description
    - Documents list with download, loading indicator, error with retry, empty state
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 4.5 Create `src/components/tender-detail/developer-section.tsx`
    - Collapsed by default with "Developer" toggle header
    - Expanded: system info fields (retry_count, last_attempt, last_error, s3_prefix, discovered_run_id, processed_run_id, analysis_model) — show "—" for null values
    - Audit trail records ordered by created_at desc (step, run_id, created_at, model, model_version, duration_ms)
    - Error isolation: audit failure doesn't affect system info; empty state for 0 records
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 5. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Compose the page and wire state routing
  - [x] 6.1 Rewrite `src/pages/TenderDetailPage.tsx` with state-based composition
    - Import `classifyTenderState` and call it after data fetch
    - Redirect to `/tenders` if state is `skipped` (before render)
    - Warnings banner above header when warnings array is non-empty
    - Compose zones per state visibility matrix: unanalyzed (Header + Details + Documents), legacy_analyzed (Header + Verdict + Tabs + Details + Documents + Developer), fully_analyzed (Header + Verdict + Tabs + Details + Documents + Developer)
    - Omit sections entirely when data prerequisites are all null
    - Preserve existing loading/error/404 handling
    - _Requirements: 2.1, 3.11, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 6.2 Add skipped tender handling to the List_Page
    - Display skip_reason in tooltip on hover for skipped tenders
    - Show generic "Skipped" label when skip_reason is null
    - Display source website link for skipped tenders (opens in new tab)
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 6.3 Write unit tests for page composition
    - Test each state renders correct sections (unanalyzed, legacy_analyzed, fully_analyzed)
    - Test skipped state triggers redirect
    - Test warnings banner rendering
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 7. Remove old components
  - [x] 7.1 Delete replaced component files and update imports
    - Remove: `header-section.tsx`, `ai-assessment-section.tsx`, `feedback-buttons.tsx`, `key-facts-section.tsx`, `score-breakdown-section.tsx`, `team-requirements-section.tsx`, `team-match-section.tsx`, `reference-requirements-section.tsx`, `reference-match-section.tsx`, `exclusion-criteria-section.tsx`, `exclusion-banner.tsx`, `eligibility-section.tsx`, `system-info-section.tsx`, `audit-trail-section.tsx`
    - Remove associated property test files for deleted components
    - Verify no remaining imports reference deleted files
    - _Requirements: all (cleanup of superseded code)_

- [x] 8. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The existing `useTenderActions` hook already provides mutation support — `ActionsDropdown` wraps it in a UI
- The existing `useTenderDocuments` and `useTenderAudit` hooks remain unchanged and are consumed by the new `DetailsSection` and `DeveloperSection`
- Tab state is local (useState) — no URL or localStorage persistence needed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "1.5", "2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "4.1", "4.2"] },
    { "id": 3, "tasks": ["4.3", "4.4", "4.5"] },
    { "id": 4, "tasks": ["6.1", "6.2"] },
    { "id": 5, "tasks": ["6.3", "7.1"] }
  ]
}
```
