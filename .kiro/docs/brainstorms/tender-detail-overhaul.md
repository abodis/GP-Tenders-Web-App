# Tender Detail Overhaul (Phase 5) Brainstorm

## What We're Building

Major overhaul of the existing tender detail page (currently 376 lines, monolithic) to add six new sections: team requirements + match display, reference requirements + match display, exclusion criteria, unified score breakdown, feedback (thumbs up/down), and audit trail. Plus inline action buttons to trigger LLM extraction/matching/evaluation.

## Core Problem

The tender detail page currently shows basic tender info and eligibility data. With Team and References now managed (Phases 3-4), the system can match them against tender requirements — but users have no way to see those matches, trigger extractions, provide feedback, or inspect the scoring pipeline. This phase surfaces the full intelligence layer.

## Key Decisions Made

- **Page structure**: Extract into section components (🟢 80%) — `TenderDetailPage.tsx` becomes orchestrator (~150 lines), sections live in `src/components/tender-detail/`. Same scroll-page UX, better code organization.
- **Action buttons**: Inline within each section (🟢 80%) — "Extract Team Requirements" inside Team section, "Run Match" appears once requirements exist. Fire-and-forget: show spinner, refetch tender detail on success, toast on error.
- **Feedback state**: Read from `feedback_type` field on `TenderDetailResponse` (enum `interesting`/`boring` or null). Mutations update optimistically + invalidate query. No separate GET needed.
- **Score breakdown**: Factor list with progress indicators (🟢 75%) — vertical list showing each factor name, sub-score, computed factor value, colored bar. "Pending" for uncomputed factors. Multiplication doesn't map to stacked bar.
- **Audit trail**: Collapsible accordion per entry (🟢 80%) — lazy-loaded (separate API call), step filter dropdown, each entry shows step + model + timestamp + duration in header, expandable JSON for input/output with max-height scroll.
- **Team match links**: Clicking matched team member name navigates to `/team/:id`
- **Legacy eligibility section**: Show when new `team_requirements`/`reference_requirements` fields are null. Hide when new data exists (new sections supersede legacy display).
- **Excluded tenders**: Red banner at page top when `exclusion_result.excluded === true`, showing `exclusion_reasons` summary.
- **Spec breakdown**: 6 specs, dependency-ordered (data layer first, then feature sections)

## Constraints Discovered

- `team_requirements`, `team_match_result`, `reference_requirements`, `reference_match_result`, `exclusion_result` are JSONB blobs — present in OpenAPI as generic `object | null` (no proper schemas)
- **OpenAPI gaps**: 10 items lack proper schemas (5 action endpoint responses + 5 TenderDetailResponse fields) — backend team needs to add named `$ref` schemas. See "Backend TODO" section below.
- No GET endpoint for feedback — only POST (upsert) and DELETE
- Audit trail is a separate endpoint returning an array (not paginated), filterable by `step` and `run_id`
- Action endpoints are idempotent (safe to re-run) and return generic `object` — we'll invalidate tender detail query on success
- `interestingness_reasoning` field exists in OpenAPI but not in current TS types — needs adding
- Current `TenderDetailResponse` TS type is missing: `team_requirements`, `team_match_result`, `reference_requirements`, `reference_match_result`, `exclusion_result`, `interestingness_reasoning`
- Unified score is client-side computable from existing fields (no dedicated endpoint)

## Backend TODO (OpenAPI Schema Gaps)

These endpoints/fields return untyped `{ type: object, additionalProperties: true }` and need proper schemas:

**Action endpoint responses:**
1. `POST .../extract-team` → should return `TeamRequirements` schema
2. `POST .../extract-references` → should return `ReferenceRequirements` schema
3. `POST .../check-exclusion` → should return `ExclusionResult` schema
4. `POST .../team-match` → should return `TeamMatchResult` schema
5. `POST .../reference-match` → should return `ReferenceMatchResult` schema

**TenderDetailResponse fields (should `$ref` named schemas):**
6. `team_requirements` → `TeamRequirements`
7. `team_match_result` → `TeamMatchResult`
8. `reference_requirements` → `ReferenceRequirements`
9. `reference_match_result` → `ReferenceMatchResult`
10. `exclusion_result` → `ExclusionResult`

Also untyped but acceptable: `detail` (raw upstream JSON — legitimately freeform).

Legacy fields (`experts_required`, `references_required`, `turnover_required`) now have proper schemas with `additionalProperties: true` (LLM best-effort shape).

**Additional request:** ~~Add `feedback_type: string | null` to `TenderDetailResponse`~~ DONE — backend added `feedback_type: enum(interesting, boring) | null`, default null.

## Integration Points

- `src/api/types.ts`: Add ~10 new interfaces: `TeamRequirement`, `TeamRequirementsData`, `RoleMatch`, `TeamMatchResult`, `ReferenceRequirement`, `RequirementMatch`, `ReferenceMatchResult`, `ExclusionCriterion`, `ExclusionResult`, `AuditRecord`, `FeedbackRequest`, `FeedbackResponse`. Extend `TenderDetailResponse` with new nullable fields.
- `src/api/endpoints.ts`: Add `extractTeamRequirements`, `runTeamMatch`, `extractReferenceRequirements`, `runReferenceMatch`, `checkExclusion`, `submitFeedback`, `deleteFeedback`, `getTenderAudit`
- `src/hooks/useTenderAudit.ts`: `useQuery` with `['tenderAudit', sourceId, tenderId, { step }]`
- `src/hooks/useTenderFeedback.ts`: `useMutation` for submit/delete, optimistic state management
- `src/hooks/useTenderActions.ts`: Mutations for extract/match/exclusion with tender detail invalidation
- `src/components/tender-detail/`: New directory with section components:
  - `TeamRequirementsSection.tsx` — requirements table + extract button
  - `TeamMatchSection.tsx` — match score, role matches table, gaps, run match button
  - `ReferenceRequirementsSection.tsx` — requirements table + extract button
  - `ReferenceMatchSection.tsx` — match score, requirement matches, gaps, run match button
  - `ExclusionSection.tsx` — criteria table, banner, check button
  - `ScoreBreakdownSection.tsx` — factor list visualization
  - `FeedbackButtons.tsx` — thumbs up/down toggle
  - `AuditTrailSection.tsx` — accordion with step filter, JSON views
- `src/pages/TenderDetailPage.tsx`: Refactor to import and compose sections

## Unified Score Formula (for reference)

```
unified_score = interestingness x eval_factor x team_factor x ref_factor x exclusion_factor

eval_factor       = 0.6 + (relevance_score / 10) x 0.4       (range 0.64-1.0)
team_factor       = 0.7 + team_match_score x 0.3              (range 0.7-1.0)
ref_factor        = 0.7 + reference_match_score x 0.3         (range 0.7-1.0)
exclusion_factor  = 0.0 if excluded, 1.0 otherwise
```

Missing sub-scores use neutral factor 1.0 (no penalty for uncomputed data).

## Verification Plan

- `npm run build` passes after each spec
- Manual browser check against local API for each new section
- Conditional rendering handles null/missing data gracefully (most fields are nullable)
- Action buttons show loading state and handle errors
- Audit trail lazy-loads only when section expanded
- Score breakdown computes correctly from available data
- Feedback buttons toggle correctly and persist through mutation
- Legacy eligibility section hides when new data present
- Exclusion banner shows prominently when `excluded === true`

## Open Questions

- [x] ~~Will backend add `feedback_type` to `TenderDetailResponse`?~~ DONE
- [x] ~~Action endpoint response schemas — blocked on backend adding proper types to OpenAPI~~ DONE
- [ ] Minor: requirements doc uses `donor`, OpenAPI uses `donor_preference` in `ReferenceRequirement` — confirm which name the API actually returns

## Next Steps (spec breakdown)

1. **Spec A: Data layer + page decomposition** — types, endpoints, hooks for all Phase 5 features + extract existing TenderDetailPage sections into `src/components/tender-detail/` components (pure refactor of existing behavior)
2. **Spec B: Team requirements + match sections** — TeamRequirementsSection + TeamMatchSection + extract/match action buttons
3. **Spec C: Reference requirements + match sections** — ReferenceRequirementsSection + ReferenceMatchSection + extract/match action buttons
4. **Spec D: Exclusion criteria section** — ExclusionSection + check-exclusion button + red banner
5. **Spec E: Score breakdown + feedback** — ScoreBreakdownSection + FeedbackButtons
6. **Spec F: Audit trail** — AuditTrailSection with step filter + collapsible JSON
