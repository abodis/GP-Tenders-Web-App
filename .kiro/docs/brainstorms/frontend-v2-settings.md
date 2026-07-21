# Frontend v2 — Settings Section

## What We're Building

Add two new settings sections (`interestingness` and `digest`) to the existing Settings page, following the established Section/Card pattern.

## Core Problem

The backend now supports 6 setting types but the frontend only exposes 4. The missing `interestingness` and `digest` settings control the scoring gate and email digest behavior — users can't configure them without direct API calls.

## Key Decisions Made

- **Interest profile textarea**: Markdown with preview (🟢 80%) — improves usability for multi-paragraph profiles; backend stores raw text regardless
- **Validation timing**: On-save only (🟢 85%) — matches existing pattern, avoids complexity
- **Scoring criteria forbidden values**: Frontend inline feedback on save (🟢 75%) — check against blocklist before submitting, show field-level error if violated

## Constraints Discovered

- `interest_profile` max 5000 chars — need char counter
- `interestingness_top_n` range 1–1000
- `interestingness_min_score` range 1–10
- `score_threshold_top` must be > `score_threshold_floor` — cross-field validation
- `max_worth_a_look` and `max_excluded_shown` — positive integers, no documented upper bound
- Forbidden scoring criteria: "sector fit", "geographic fit", "expertise match" (handled by interestingness instead)
- Existing pattern: each Section has its own save button + success indicator + error display

## Integration Points

- `src/api/types.ts`: add `InterestingnessSettings`, `DigestSettings` to union
- `src/api/endpoints.ts`: no changes needed (generic `putSetting` already works)
- `src/hooks/useSettings.ts`: add to `select` map + type assertions
- `src/pages/SettingsPage.tsx`: two new section components

## Verification Plan

- Settings page loads without errors with all 6 sections visible
- Each new section saves successfully (network tab confirms PUT)
- Validation: forbidden criteria rejected with inline error
- Validation: digest `top > floor` enforced on save
- Markdown preview renders formatted text for interest_profile
- `npm run build` passes
- `npm run test` passes

## Open Questions

- [ ] Upper bounds for `max_worth_a_look` and `max_excluded_shown` (use 1000 as reasonable cap for now)

## Next Steps

1. Add types for `interestingness` and `digest` to `api/types.ts`
2. Update `useSettings` hook select to include new types
3. Add `InterestingnessSection` component to SettingsPage
4. Add `DigestSection` component to SettingsPage
5. Add markdown preview component (or use simple toggle)
6. Verify build + tests pass
