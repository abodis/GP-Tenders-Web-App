# Implementation Plan: Settings Interestingness & Digest Sections

## Overview

Add InterestingnessSettings and DigestSettings types, extend the useSettings hook, install `marked`, create a MarkdownPreview component, implement the two new section components inline in SettingsPage.tsx, add forbidden criteria validation to AnalysisSection, and reorder page sections. Each task builds on the previous — types first, then hook, then components, then wiring.

## Tasks

- [ ] 1. Add new types and extend unions in `src/api/types.ts`
  - [ ] 1.1 Add InterestingnessSettings and DigestSettings interfaces, extend SettingType union and SettingResponse union
    - Add `InterestingnessSettings` interface with fields: `setting_type: 'interestingness'`, `updated_at: string`, `interest_profile: string`, `scoring_criteria: string[]`, `interestingness_top_n: number`, `interestingness_min_score: number`
    - Add `DigestSettings` interface with fields: `setting_type: 'digest'`, `updated_at: string`, `score_threshold_top: number`, `score_threshold_floor: number`, `max_worth_a_look: number`, `max_excluded_shown: number`
    - Extend `SettingType` union to include `'interestingness' | 'digest'`
    - Extend `SettingResponse` union to include `InterestingnessSettings | DigestSettings`
    - _Requirements: 9.1, 9.4_

- [ ] 2. Extend useSettings hook
  - [ ] 2.1 Add interestingness and digest properties to useSettings select function
    - Import `InterestingnessSettings` and `DigestSettings` from `@/api/types`
    - Add `interestingness: map.get('interestingness') as InterestingnessSettings | undefined` to the select return object
    - Add `digest: map.get('digest') as DigestSettings | undefined` to the select return object
    - _Requirements: 9.2, 9.3, 9.5, 9.6_

- [ ] 3. Install `marked` and create MarkdownPreview component
  - [ ] 3.1 Install the `marked` package
    - Run `npm install marked`
    - _Requirements: 2.3_

  - [ ] 3.2 Create `src/components/MarkdownPreview.tsx`
    - Accept props: `content: string`, `className?: string`
    - Use `marked` to parse markdown to HTML
    - Render via `dangerouslySetInnerHTML`
    - Apply prose styling via Tailwind classes
    - _Requirements: 2.3, 2.4_

- [ ] 4. Checkpoint - Ensure types, hook, and MarkdownPreview compile
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement InterestingnessSection in SettingsPage.tsx
  - [ ] 5.1 Add InterestingnessSection component inline in SettingsPage.tsx
    - Props: `{ data: InterestingnessSettings }`
    - Local state: `interestProfile`, `topN`, `minScore`, `showPreview`, `errors`
    - useEffect to sync from data prop
    - Character counter showing `{length}/5000` below textarea, enforce maxLength
    - Edit/Preview toggle button pair for markdown preview (uses MarkdownPreview component)
    - Validation on save: interest_profile non-empty after trim and ≤ 5000 chars; top_n integer 1–1000; min_score integer 1–10
    - Use `useSaveSetting<InterestingnessSettings>('interestingness')` for mutation
    - Section wrapper with title "Interestingness", badge "scoring", description, and updatedAt
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

- [ ] 6. Implement DigestSection in SettingsPage.tsx
  - [ ] 6.1 Add DigestSection component inline in SettingsPage.tsx
    - Props: `{ data: DigestSettings }`
    - Local state: `thresholdTop`, `thresholdFloor`, `maxWorthALook`, `maxExcluded`, `errors`
    - useEffect to sync from data prop
    - Numeric inputs: score_threshold_top (0–10, step 0.1), score_threshold_floor (0–10, step 0.1), max_worth_a_look (integer 1–1000), max_excluded_shown (integer 1–1000)
    - Cross-field validation: score_threshold_top must be > score_threshold_floor
    - Range validation for all fields
    - Use `useSaveSetting<DigestSettings>('digest')` for mutation
    - Section wrapper with title "Digest", description, and updatedAt
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [ ] 7. Add forbidden criteria validation to AnalysisSection
  - [ ] 7.1 Add forbidden criteria check to AnalysisSection handleSave
    - Define `FORBIDDEN_CRITERIA = ['sector fit', 'geographic fit', 'expertise match']`
    - In `handleSave`, filter criteria for entries matching forbidden values (trimmed, case-insensitive)
    - If any match, set `errs.criteria` with message identifying each forbidden value by name
    - Prevent submission when forbidden criteria are present
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 8. Reorder sections and update page header
  - [ ] 8.1 Wire new sections into SettingsPage layout in correct order and update header
    - Import `InterestingnessSettings` and `DigestSettings` types
    - Import `MarkdownPreview` component (if not already imported in InterestingnessSection)
    - Render order: SelectionCriteria → Analysis → Interestingness → CompanyProfile → Recipients → Digest
    - Conditionally render InterestingnessSection only when `data?.interestingness` exists
    - Conditionally render DigestSection only when `data?.digest` exists
    - Update header description to include "interestingness scoring" and "email digest"
    - _Requirements: 1.3, 5.3, 10.1, 10.2, 10.3, 10.4_

- [ ] 9. Final checkpoint - Ensure build passes and app renders correctly
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- No unit/integration tests per project testing strategy — verification via Playwright smoke tests against local backend
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- `marked` is a lightweight (~7KB gzipped) markdown renderer chosen over heavier alternatives like react-markdown
- The forbidden criteria validation is a simple addition to the existing AnalysisSection handleSave function
- All new sections follow the exact same Section/Card pattern as existing sections (local state, useEffect sync, validate-on-save, useSaveSetting mutation)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["3.2"] },
    { "id": 3, "tasks": ["5.1", "6.1", "7.1"] },
    { "id": 4, "tasks": ["8.1"] }
  ]
}
```
