# Implementation Plan: Tender Detail Overhaul

## Overview

Transform the monolithic `TenderDetailPage.tsx` into a composable section-based architecture with 16 section components, 3 new hooks, new TypeScript interfaces, API endpoint functions, and a pure scoring utility. Implementation follows a data-layer-first approach, then page decomposition of existing sections, then new feature sections in dependency order.

## Tasks

- [x] 1. Data layer: types, endpoints, and scoring utility
  - [x] 1.1 Add new TypeScript interfaces to `src/api/types.ts`
    - Add `TeamRequirement`, `TeamRequirementsData`, `TeamRequirementsExtractionResponse`
    - Add `BestMatch`, `RoleMatch`, `GapEntry`, `TeamMatchResult`
    - Add `ReferenceRequirement`, `ReferenceRequirementsData`, `ReferenceRequirementsExtractionResponse`
    - Add `ReferenceBestMatch`, `RequirementMatch`, `ReferenceGapEntry`, `ReferenceMatchResult`
    - Add `ExclusionCategory`, `ExclusionCriterion`, `ExclusionResult`, `ExclusionResultResponse`
    - Add `AuditRecord`, `FeedbackRequest`, `FeedbackResponse`
    - Extend `TenderDetailResponse` with nullable fields: `team_requirements`, `team_match_result`, `reference_requirements`, `reference_match_result`, `exclusion_result`, `feedback_type`, `interestingness_reasoning`
    - _Requirements: 11.1, 11.2_

  - [x] 1.2 Add new endpoint functions to `src/api/endpoints.ts`
    - Add `extractTeamRequirements`, `runTeamMatch`, `extractReferenceRequirements`, `runReferenceMatch`, `checkExclusion`, `submitFeedback`, `deleteFeedback`, `getTenderAudit`
    - Use `apiPost` for action endpoints, `apiDelete` for delete-feedback, `apiFetch` for audit GET
    - _Requirements: 11.3, 11.5_

  - [x] 1.3 Create `src/utils/scoring.ts` with `computeScoreFactors`
    - Implement `ScoreFactors` interface and `computeScoreFactors` pure function
    - Formulas: interestingness = score/10, eval_factor = 0.6 + (relevance/10)×0.4, team_factor = 0.7 + team_match×0.3, ref_factor = 0.7 + ref_match×0.3, exclusion_factor = excluded ? 0 : 1
    - Return null for any factor whose source value is null
    - _Requirements: 7.6_

  - [x] 1.4 Write property test for `computeScoreFactors`
    - **Property 8: Unified score factor computation correctness**
    - **Validates: Requirements 7.6**
    - Use fast-check arbitraries for interestingness_score (integer 0–10 | null), relevance_score (integer 0–10 | null), team_match_score (float 0–1 | null), reference_match_score (float 0–1 | null), excluded (boolean | null)
    - Assert each returned factor matches the formula or is null when source is null

  - [x] 1.5 Write property test for endpoint URL construction
    - **Property 10: Endpoint URL construction correctness**
    - **Validates: Requirements 11.3**
    - Use fast-check to generate arbitrary non-empty sourceId/tenderId strings
    - Assert each endpoint function constructs the correct URL path

- [x] 2. Hooks: actions, feedback, and audit
  - [x] 2.1 Create `src/hooks/useTenderActions.ts`
    - Expose mutations: `extractTeam`, `runTeamMatch`, `extractReferences`, `runReferenceMatch`, `checkExclusion`
    - Each mutation invalidates `['tenderDetail', sourceId, tenderId]` on success
    - Accept `sourceId` and `tenderId` as parameters
    - _Requirements: 11.4, 2.4, 3.6, 4.4, 5.5, 6.7_

  - [x] 2.2 Create `src/hooks/useTenderFeedback.ts`
    - Expose `submitMutation` and `deleteMutation`
    - Implement optimistic update: on mutate, cancel queries, snapshot previous, set new feedback_type
    - On error: rollback to previous snapshot
    - On settled: invalidate query
    - _Requirements: 11.4, 8.5, 8.6, 8.7_

  - [x] 2.3 Create `src/hooks/useTenderAudit.ts`
    - Use `useQuery` with query key `['tenderAudit', sourceId, tenderId, { step }]`
    - Accept `enabled` boolean for lazy loading (fetch only when expanded)
    - Accept optional `step` filter parameter
    - _Requirements: 11.4, 9.1, 9.4_

- [x] 3. Page decomposition: extract existing sections into components
  - [x] 3.1 Create `src/components/tender-detail/header-section.tsx`
    - Extract title, organization, badges, external link from existing page
    - Props: `tender: TenderDetailResponse`
    - _Requirements: 1.1, 1.3_

  - [x] 3.2 Create `src/components/tender-detail/ai-assessment-section.tsx`
    - Extract summary + fit analysis rendering with AI badge tooltips
    - Props: `tender: TenderDetailResponse`
    - _Requirements: 1.1, 1.3_

  - [x] 3.3 Create `src/components/tender-detail/key-facts-section.tsx`
    - Extract budget/deadline/location grid
    - Props: `tender: TenderDetailResponse`
    - _Requirements: 1.1, 1.3_

  - [x] 3.4 Create `src/components/tender-detail/eligibility-section.tsx`
    - Extract eligibility sub-groups with legacy supersession logic
    - When `team_requirements` is not null, hide `experts_required` sub-section
    - When `reference_requirements` is not null, hide `references_required` sub-section
    - Always show `turnover_required` when present
    - Hide entire section heading when all sub-sections are hidden/null
    - Props: `tender: TenderDetailResponse`
    - _Requirements: 1.1, 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 3.5 Create `src/components/tender-detail/description-section.tsx`
    - Extract collapsible description with expand/collapse toggle
    - Props: `descriptionText: string | null`
    - _Requirements: 1.1, 1.3_

  - [x] 3.6 Create `src/components/tender-detail/documents-section.tsx`
    - Extract documents table with loading/error/empty states and download handler
    - Props: `sourceId: string, tenderId: string`
    - _Requirements: 1.1, 1.3_

  - [x] 3.7 Create `src/components/tender-detail/system-info-section.tsx`
    - Extract collapsible system metadata grid
    - Props: `tender: TenderDetailResponse`
    - _Requirements: 1.1, 1.3_

  - [x] 3.8 Rewrite `TenderDetailPage.tsx` as orchestrator
    - Import and compose all section components
    - Keep only: route param extraction, loading/error/404 states, conditional rendering logic
    - Target ≤ 180 lines (excluding imports)
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6_

- [x] 4. Checkpoint - Verify page decomposition
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npm run build` and `npm run test` to verify no regressions.

- [x] 5. Team requirements and match sections
  - [x] 5.1 Create `src/components/tender-detail/team-requirements-section.tsx`
    - Render table of roles when `team_requirements` is not null and has items
    - Columns: role name, mandatory (yes/no), min_years (int or "—"), specializations (comma-sep or "—"), languages (comma-sep or "—")
    - Show extraction confidence badge and total_experts_required (or "Unknown")
    - Show empty-state message when array is empty
    - Show "Extract Team Requirements" button when null and status is `completed`
    - Button uses `useTenderActions.extractTeam` with spinner/disable pattern
    - Error toast on failure
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 5.2 Create `src/components/tender-detail/team-match-section.tsx`
    - Display overall `team_match_score` as colored percentage (green ≥0.7, amber 0.4–0.69, red <0.4)
    - Render role matches table: required_role, mandatory, status, best_match name (linked to `/team/{id}`), match_score %
    - Render gap summary with severity distinction (high vs low)
    - Show "Run Team Match" button when `team_requirements` exists but `team_match_result` is null
    - Button uses `useTenderActions.runTeamMatch` with spinner/disable/error-toast pattern
    - Empty state when role_matches array is empty
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 5.3 Write property test for team requirements rendering
    - **Property 2: Team requirements rendering completeness**
    - **Validates: Requirements 2.1, 2.6**
    - Generate arbitrary `TeamRequirementsData` with N≥1 requirements
    - Assert rendered output contains N rows with correct field displays

  - [x] 5.4 Write property test for team match rendering
    - **Property 3: Team match result rendering completeness**
    - **Validates: Requirements 3.2, 3.3, 3.4**
    - Generate arbitrary `TeamMatchResult` objects
    - Assert score color mapping, role match rows, gap rendering, and link generation

- [x] 6. Reference requirements and match sections
  - [x] 6.1 Create `src/components/tender-detail/reference-requirements-section.tsx`
    - Render table when `reference_requirements` has items: domain, mandatory, min_projects, min_value_eur (EUR currency), max_age_years, region, donor_preference, notes — null as "—"
    - Show extraction confidence badge and total_references_required (or "Unknown")
    - Show empty-state when array is empty
    - Show "Extract Reference Requirements" button when null and status is `completed`
    - Button uses `useTenderActions.extractReferences` with spinner/disable/error-toast
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 6.2 Create `src/components/tender-detail/reference-match-section.tsx`
    - Display `reference_match_score` as colored percentage (green ≥70%, amber 40–69%, red <40%)
    - Render requirement matches: domain, mandatory badge, status, coverage_count, up to 3 best match titles sorted by descending match_score
    - Render gap summary with severity distinction
    - Show "Run Reference Match" button when `reference_requirements` exists but `reference_match_result` is null
    - Button uses `useTenderActions.runReferenceMatch` with spinner/disable/error-toast
    - Empty state when requirement_matches array is empty
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 6.3 Write property test for reference requirements rendering
    - **Property 4: Reference requirements rendering completeness**
    - **Validates: Requirements 4.1, 4.6**
    - Generate arbitrary `ReferenceRequirementsData` with N≥1 requirements
    - Assert rendered output contains N rows with correct field displays

  - [x] 6.4 Write property test for reference match rendering
    - **Property 5: Reference match result rendering completeness**
    - **Validates: Requirements 5.2, 5.3**
    - Generate arbitrary `ReferenceMatchResult` objects
    - Assert score color, requirement match list, gap rendering

- [x] 7. Exclusion criteria section and banner
  - [x] 7.1 Create `src/components/tender-detail/exclusion-banner.tsx`
    - Red banner displaying all `exclusion_reasons` as bulleted list when `excluded === true`
    - Render nothing when `exclusion_result` is null or `excluded` is false
    - Props: `exclusionResult: ExclusionResult | null`
    - _Requirements: 6.1, 6.2_

  - [x] 7.2 Create `src/components/tender-detail/exclusion-criteria-section.tsx`
    - Render criteria table: criterion, category, assessment, confidence, reason
    - Show warning callout above table when `uncertain_flags` has items
    - Show extraction confidence badge
    - Show empty-state when criteria array is empty
    - Show "Check Exclusion" button when `exclusion_result` is null and status is `completed`
    - Button uses `useTenderActions.checkExclusion` with spinner/disable/error-toast
    - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [x] 7.3 Write property test for exclusion banner
    - **Property 6: Exclusion banner displays all reasons when excluded**
    - **Validates: Requirements 6.1**
    - Generate arbitrary `ExclusionResult` with `excluded=true` and N≥1 reasons
    - Assert all N reasons appear in rendered output

  - [x] 7.4 Write property test for exclusion criteria section
    - **Property 7: Exclusion criteria section rendering**
    - **Validates: Requirements 6.3, 6.5, 6.9**
    - Generate arbitrary `ExclusionResult` with M≥1 criteria and K≥0 uncertain flags
    - Assert M rows rendered, confidence badge shown, warning callout when K>0

- [x] 8. Score breakdown and feedback sections
  - [x] 8.1 Create `src/components/tender-detail/score-breakdown-section.tsx`
    - Display unified_score formatted to 2 decimal places (larger font) when non-null
    - Show "not computed" label when unified_score is null, no factor rows
    - Render factor list in order: interestingness, eval_factor, team_factor, ref_factor, exclusion_factor
    - Each factor: name, source sub-score, computed value (2dp), progress bar (0–1 proportional)
    - Pending factors: "Pending" label, 0% bar, muted styling
    - Exclusion factor = 0: red/destructive color indicator
    - Use `computeScoreFactors` utility for client-side calculation
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 8.2 Create `src/components/tender-detail/feedback-buttons.tsx`
    - Two mutually exclusive toggle buttons: thumbs-up (interesting), thumbs-down (boring)
    - Active state based on `feedback_type` prop
    - Click inactive button → `submitMutation` with optimistic toggle
    - Click active button → `deleteMutation` with optimistic clear
    - Revert on error + error toast
    - Props: `sourceId, tenderId, feedbackType: 'interesting' | 'boring' | null`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 8.3 Write property test for score visualization color mapping
    - **Property 1: Score visualization maps [0,1] to colored percentage**
    - **Validates: Requirements 3.1, 5.1**
    - Generate arbitrary scores in [0,1]
    - Assert: displayed value = round(score×100), color = green≥0.7, amber∈[0.4,0.7), red<0.4

- [x] 9. Audit trail section
  - [x] 9.1 Create `src/components/tender-detail/audit-trail-section.tsx`
    - Collapsed by default, fetch data on expand via `useTenderAudit` with `enabled` flag
    - Show loading indicator while fetching
    - Step filter dropdown: "All", analysis, team_extraction, team_match, reference_extraction, reference_match, exclusion, interestingness, unified_score
    - Render accordion list ordered by `created_at` descending
    - Header: step name, model (or "—"), locale date-time, duration_ms (or "—")
    - Expanded: `input_snapshot` and `output` as formatted JSON in scrollable container (max-height 400px)
    - Empty state message when no records
    - Error state with retry action
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

  - [x] 9.2 Write property test for audit record rendering
    - **Property 9: Audit record rendering completeness**
    - **Validates: Requirements 9.5, 9.6**
    - Generate arbitrary `AuditRecord` objects
    - Assert header shows step, model/"—", formatted timestamp, duration/"—"
    - Assert expanded shows JSON content in scrollable container

- [x] 10. Wire new sections into page orchestrator
  - [x] 10.1 Update `TenderDetailPage.tsx` to include all new sections
    - Add `ExclusionBanner` after warnings section
    - Add `FeedbackButtons` after AI assessment
    - Add `ScoreBreakdownSection` after key facts
    - Add `TeamRequirementsSection` and `TeamMatchSection` after score breakdown
    - Add `ReferenceRequirementsSection` and `ReferenceMatchSection` after team sections
    - Add `ExclusionCriteriaSection` before eligibility
    - Add `AuditTrailSection` before system info
    - Pass appropriate props (tender, sourceId, tenderId) to each section
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 11. Final checkpoint - Verify complete implementation
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npm run build` and `npm run test` to confirm no regressions.
  - Verify page renders correctly with all sections.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Implementation order ensures each task builds on previous: data layer → hooks → existing section extraction → new feature sections → final wiring
- All action buttons follow the consistent UX pattern: idle → spinner → invalidate on success / toast on error
- The `useTenderActions` hook is shared across team, reference, and exclusion sections

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2", "1.4", "1.5"] },
    { "id": 2, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 3, "tasks": ["3.1", "3.2", "3.3", "3.5", "3.7"] },
    { "id": 4, "tasks": ["3.4", "3.6"] },
    { "id": 5, "tasks": ["3.8"] },
    { "id": 6, "tasks": ["5.1", "6.1", "7.1", "8.1", "8.2"] },
    { "id": 7, "tasks": ["5.2", "6.2", "7.2", "9.1"] },
    { "id": 8, "tasks": ["5.3", "5.4", "6.3", "6.4", "7.3", "7.4", "8.3", "9.2"] },
    { "id": 9, "tasks": ["10.1"] }
  ]
}
```
