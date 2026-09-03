# Implementation Plan: Header & Verdict Zone Compact Layout

## Overview

Refactor `header-zone.tsx` and `verdict-zone.tsx` to produce a more compact tender detail layout. Two files modified, no new files created.

## Tasks

- [x] 1. Refactor HeaderZone component
  - [x] 1.1 Add `buildMetadataRow` helper and replace multi-line metadata with single dot-separated row
    - Create `buildMetadataRow(tender)` function that joins organization (or "Unknown organization"), tender type (if non-null), formatted deadline, and location (if non-null) with ` · `
    - Replace the separate organization `<p>`, tender type `<p>`, and meta row `<div>` (deadline, location, source link) with a single `<p>` rendering the metadata row
    - Remove the "View on source" link (handled by ActionsDropdown)
    - _Requirements: 1.1, 1.3, 1.4, 1.5_

  - [x] 1.2 Move FeedbackButtons to left column below ScoreBadge
    - Move `<FeedbackButtons>` from the right column actions row into the left column `<div>`, positioned below `<ScoreBadge>`
    - Remove `FeedbackButtons` from the actions row, leaving only `<ActionsDropdown>`
    - _Requirements: 2.1, 2.2, 2.3, 5.1_

  - [x] 1.3 Remove analysis tags rendering and Badge import
    - Delete the `analysis_tags` conditional rendering block
    - Remove the `Badge` import from `@/components/ui/badge`
    - _Requirements: 3.1, 3.2_

- [x] 2. Refactor VerdictZone component
  - [x] 2.1 Remove ScoreBadge from VerdictZone
    - Delete the `ScoreBadge` import
    - Remove the `showScore` variable
    - Remove the ScoreBadge rendering block from the left column
    - Factor bars render directly at the top of the left column
    - _Requirements: 4.1, 4.3_

- [x] 3. Verify build passes
  - [x] 3.1 Run TypeScript check and production build
    - Run `tsc --noEmit` and `npm run build` to confirm no type errors or build failures
    - Ensure all tests pass, ask the user if questions arise.
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [ ]* 4. Write unit tests for buildMetadataRow helper
  - [ ]* 4.1 Write property test for metadata row construction
    - **Property 1: Metadata row contains all non-null fields joined by dot separators**
    - **Validates: Requirements 1.1, 1.3, 1.4, 1.5**

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Only two source files are modified: `header-zone.tsx` and `verdict-zone.tsx`
- No new files or components are created
- The `ActionsDropdown` already contains the "View on source" link, so removing it from the header is safe
- Property tests validate the `buildMetadataRow` helper logic for null-field handling

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["4.1"] }
  ]
}
```
