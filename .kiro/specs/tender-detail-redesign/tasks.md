# Implementation Plan: Tender Detail Page Redesign

## Overview

Reorganize `TenderDetailPage.tsx` into a three-tier information hierarchy (Should I keep reading? → Can we bid? → System details). Create three new files (`RelevanceScoreVisual`, `InfoTooltip`, `formatEur`), restructure the page layout, add collapsible sections, and consolidate eligibility requirements with a notes-primary pattern. Data fetching is unchanged.

## Tasks

- [x] 1. Add `formatEur` utility and `RelevanceScoreVisual` component
  - [x] 1.1 Add `formatEur` function to `src/utils/formatting.ts`
    - Export `formatEur(value: number): string` reusing the existing `eurFormatter` instance
    - _Requirements: 4.10_

  - [ ]* 1.2 Write property test for `formatEur` (Property 5: EUR currency formatting)
    - **Property 5: EUR currency formatting for eligibility values**
    - Generate random non-negative integers with fast-check, assert output contains "€" and uses EUR format
    - **Validates: Requirements 4.10**

  - [x] 1.3 Create `src/components/RelevanceScoreVisual.tsx`
    - Accept `score: number | null` prop
    - Render a large colored circle/badge using `getScoreBadgeColor` for color logic
    - Use Tailwind classes: green bg for 7–10, yellow for 4–6, red for 1–3, gray for null/0
    - Display the numeric score (or "N/A" / "Filtered" label) prominently
    - _Requirements: 1.3_

  - [ ]* 1.4 Write property test for `RelevanceScoreVisual` color mapping (Property 1: Score color mapping)
    - **Property 1: Score color mapping**
    - Render `RelevanceScoreVisual` with random scores 0–10 and null, assert correct color class applied
    - **Validates: Requirements 1.3**

- [x] 2. Create `InfoTooltip` component
  - [x] 2.1 Create `src/components/InfoTooltip.tsx`
    - Render a lucide-react `Info` icon that reveals `children` content on hover via shadcn/ui Tooltip
    - Accept `children: React.ReactNode` as tooltip content
    - _Requirements: 4.4_

- [x] 3. Checkpoint — Verify new components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Restructure `TenderDetailPage.tsx` — Header and Key Facts
  - [x] 4.1 Rewrite Header Section in `TenderDetailPage.tsx`
    - Display title as primary `h1` heading
    - Display organization name directly below/beside title
    - Replace `ScoreBadge` with `RelevanceScoreVisual` in the header
    - Display `StatusBadge` with `status_name` when available
    - De-emphasize `source_id` and `tender_id` (smaller text, muted color)
    - Remove the old flat metadata layout
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 4.2 Rewrite Key Facts Grid
    - Render immediately below the Header Section
    - Display: Budget (via `formatBudget`), Deadline, Location, Tender Type, Posted Date, Sectors, Types, Tags
    - Show dash "—" for null/empty values
    - Render `analysis_tags` as pill-shaped badges
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 5. Restructure `TenderDetailPage.tsx` — AI Assessment and Eligibility
  - [x] 5.1 Implement AI Assessment Section
    - Render below Key Facts Grid
    - Display `analysis_context` (fit analysis) before `analysis_summary`
    - Show `analysis_model` and `analyzed_at` as subtle inline metadata near the section heading
    - Omit context block when `analysis_context` is null
    - Omit summary block when `analysis_summary` is null
    - Omit entire section when both are null
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 5.2 Implement consolidated Eligibility Section
    - Render below AI Assessment Section
    - Define inline `EligibilitySubGroup` component with `title`, `notes`, `numericContent` props
    - For each sub-group (experts, references, turnover): show `notes` as primary content when present, structured numeric data behind `InfoTooltip`
    - When `notes` is null, fall back to displaying numeric data inline
    - Format `value_eur` and `annual_eur` with `formatEur`
    - Omit each sub-group when its data is null; omit entire section when all three are null
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

- [x] 6. Restructure `TenderDetailPage.tsx` — Description, Documents, System Info
  - [x] 6.1 Implement collapsible Description Section
    - Add `useState<boolean>(false)` for `descriptionExpanded`
    - Show first 4–6 lines as preview when collapsed
    - Display "Show full description" toggle; change to "Show less" when expanded
    - Omit section when `description_text` is null
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 6.2 Keep Documents Section (minimal changes)
    - Ensure Documents Section renders below Description Section
    - Existing table with Filename, Size, Download columns is already correct
    - Verify empty state, loading spinner, and error+retry behavior are preserved
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 6.3 Implement collapsible System Info Section
    - Add `useState<boolean>(false)` for `systemInfoExpanded` (collapsed by default)
    - Include all system metadata: scraper status, retry_count, last_attempt, last_error, documents_downloaded, documents_failed, skip_reason, discovery run link, processing run link, analysis_model, analyzed_at, emailed_at, source_id, tender_id
    - Display dash "—" for null field values
    - Remove the old standalone "Scraper Status" and "Run Links" sections (now consolidated here)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 6.4 Enforce section ordering
    - Verify final render order: Warnings → Header → Key Facts Grid → AI Assessment → Eligibility → Description → Documents → System Info
    - _Requirements: 8.1_

- [x] 7. Checkpoint — Verify page restructure
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Component and property tests for the restructured page
  - [ ]* 8.1 Write property test: Conditional section omission for null data (Property 2)
    - **Property 2: Conditional section omission for null data**
    - Use fast-check to generate random `TenderDetailResponse` objects with various null field combinations
    - Mock `useTenderDetail` and `useTenderDocuments`, render `TenderDetailPage`, assert sections are absent when their data is null
    - **Validates: Requirements 1.6, 3.4, 3.5, 3.6, 4.6, 4.7, 4.8, 4.9, 5.5**

  - [ ]* 8.2 Write property test: Null field dash placeholder (Property 3)
    - **Property 3: Null field dash placeholder**
    - Generate tender data with null fields, render page, assert "—" appears for each null field in Key Facts Grid and System Info
    - **Validates: Requirements 2.4, 7.5**

  - [ ]* 8.3 Write property test: Eligibility notes-primary with numeric fallback (Property 4)
    - **Property 4: Eligibility notes-primary with numeric fallback**
    - Generate eligibility data with notes present/absent, render page, assert notes shown as primary content or numeric data shown inline
    - **Validates: Requirements 4.3, 4.5**

  - [ ]* 8.4 Write component test: Description collapse/expand behavior (Property 6)
    - **Property 6: Description collapse/expand behavior**
    - Render with long `description_text`, assert preview shown initially, click "Show full description", assert full text visible, assert toggle label changes to "Show less"
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [ ]* 8.5 Write component test: System info expand reveals all metadata (Property 7)
    - **Property 7: System info expand reveals all metadata fields**
    - Render page, assert System Info collapsed by default, click expand toggle, assert all system metadata fields visible
    - **Validates: Requirements 7.2, 7.3, 7.4**

  - [ ]* 8.6 Write unit test: Section ordering (Requirement 8.1)
    - Render full page with all sections populated, query section headings in DOM order, assert correct sequence
    - **Validates: Requirements 8.1**

- [x] 9. Final checkpoint — All tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- Data fetching hooks (`useTenderDetail`, `useTenderDocuments`) are unchanged — this is purely presentational work
- The existing `ScoreBadge` component is kept for use in other pages (tender list)
