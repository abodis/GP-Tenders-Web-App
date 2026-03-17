# Implementation Plan: RFP Web App v1

## Overview

Build a read-only React SPA for browsing scraper operations and tender results. Implementation follows the build order: repo setup → API client → app shell → runs list → run detail → tender list → tender detail. All data comes from the existing Scraper REST API. Testing uses Vitest + fast-check for property-based tests.

## Tasks

- [ ] 1. Set up project structure and dependencies
  - [x] 1.1 Scaffold Vite + React + TypeScript project
    - Initialize with `npm create vite@latest` using the `react-ts` template
    - Configure `tsconfig.json` with strict mode and path aliases (`@/` → `src/`)
    - Add `.env.example` with `VITE_API_BASE_URL` and `VITE_API_KEY` placeholders
    - _Requirements: 1.1, 1.5, 1.6_

  - [-] 1.2 Install and configure Tailwind CSS, shadcn/ui, TanStack Query, and React Router
    - Install Tailwind CSS and configure `tailwind.config.ts` and `postcss.config.js`
    - Initialize shadcn/ui with `npx shadcn@latest init`
    - Install `@tanstack/react-query` v5 and `react-router-dom` v6
    - Install test dependencies: `vitest`, `fast-check`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `msw`
    - Configure Vitest in `vite.config.ts` with jsdom environment
    - _Requirements: 1.2, 1.3, 1.4_

- [ ] 2. Implement API client layer and data types
  - [~] 2.1 Create TypeScript interfaces for all API response shapes
    - Create `src/api/types.ts` with all interfaces: `PaginatedResponse<T>`, `ErrorResponse`, `TenderListItem`, `TenderDetailResponse`, `DocumentItem`, `SourceListItem`, `RunListItem`, `RunDetailResponse`, `CollectorResult`, `RetrieverResult`, `ExpertsRequired`, `ReferencesRequired`, `TurnoverRequired`, `TenderListParams`, `PaginationParams`
    - _Requirements: 2.2, 2.3_

  - [~] 2.2 Implement the `apiFetch` generic function and `ApiError` class
    - Create `src/api/client.ts` with `apiFetch<T>(path, params?)` function
    - Implement `ApiError` class extending `Error` with `detail` and `statusCode` fields
    - Read `VITE_API_BASE_URL` and `VITE_API_KEY` from `import.meta.env`
    - Attach `x-api-key` header on every request
    - Strip `undefined`/`null` params before building URL search params
    - On non-2xx: parse JSON body for `detail`, throw `ApiError`; on JSON parse failure, throw with HTTP status text
    - _Requirements: 2.1, 2.4, 2.5, 2.6_

  - [~] 2.3 Write property tests for API client (Properties 1, 2, 3)
    - **Property 1: API key header on every request** — For any path and params, `apiFetch` includes `x-api-key` header with the configured value
    - **Validates: Requirements 2.1**
    - **Property 2: API client error propagation** — For any non-2xx status and response body, throws error with `detail` from JSON or status text for non-JSON
    - **Validates: Requirements 2.4, 2.5**
    - **Property 3: Query parameter serialization** — For any record of params, URL contains all non-undefined/non-null key-value pairs and omits undefined/null ones
    - **Validates: Requirements 2.6**

  - [~] 2.4 Implement typed endpoint wrapper functions
    - Create `src/api/endpoints.ts` with functions: `getTenders`, `getTenderDetail`, `getTenderDocuments`, `getSources`, `getSourceRuns`, `getRunDetail`, `getRunTenders`
    - Each function calls `apiFetch` with the correct path and typed return value
    - _Requirements: 2.6_

- [ ] 3. Implement utility functions
  - [~] 3.1 Create formatting utilities
    - Create `src/utils/formatting.ts` with `getScoreBadgeColor(score: number | null)` returning the color variant (green 7-10, yellow 4-6, red 1-3, gray "Filtered" for 0, gray "N/A" for null)
    - Create `formatBudget(budget: number)` returning "Not specified" for 0, EUR-formatted string for positive values
    - _Requirements: 6.9, 6.10, 6.15, 7.3_

  - [~] 3.2 Write property tests for formatting utilities (Properties 9, 10)
    - **Property 9: Score badge color mapping** — For any score 0-10 or null, returns correct color variant
    - **Validates: Requirements 6.9, 6.15**
    - **Property 10: Budget formatting** — For any non-negative integer, returns "Not specified" for 0 and EUR-formatted string for positive values
    - **Validates: Requirements 6.10, 7.3**

  - [~] 3.3 Create sorting utilities
    - Create `src/utils/sorting.ts` with `sortRunsByDate(runs: RunListItem[])` returning runs sorted by `started_at` descending
    - Create `sortTendersClientSide(tenders: TenderListItem[], field: 'budget' | 'deadline', direction: 'asc' | 'desc')` with null values sorted last
    - _Requirements: 4.3, 6.8_

  - [~] 3.4 Write property tests for sorting utilities (Properties 5, 8)
    - **Property 5: Runs sorted by date descending after merge** — For any array of run items, sorted result has each `started_at` >= next element's `started_at`
    - **Validates: Requirements 4.3**
    - **Property 8: Client-side sort correctness** — For any tender list and sort field, result is ordered correctly with nulls last
    - **Validates: Requirements 6.8**

  - [~] 3.5 Create filtering utilities
    - Create `src/utils/filtering.ts` with `filterRunsBySource(runs: RunListItem[], sourceId: string | null)` returning filtered runs or all when sourceId is null
    - _Requirements: 4.4_

  - [~] 3.6 Write property tests for filtering utilities (Properties 6, 7)
    - **Property 6: Source filter on runs list** — For any source selection and run items, filtered result contains only matching `source_id` runs; "all" includes everything
    - **Validates: Requirements 4.4**
    - **Property 7: Tender list filter correctness** — For any filter combination, query params sent to API reflect active filters, and client-side filtered tenders satisfy all active predicates
    - **Validates: Requirements 6.3, 6.4, 6.5, 6.6**

  - [~] 3.7 Create link and expiry utilities
    - Create `src/utils/links.ts` with `runIdToUrl(runId: string | null | undefined)` parsing `{source_id}#{run_date}` into `/runs/{source_id}/{run_date}`, returning null for null/undefined input
    - Create `src/utils/expiry.ts` with `isPresignedUrlExpired(fetchTimestamp: number, now: number)` returning true when elapsed time exceeds 50 minutes
    - _Requirements: 7.10, 7.16_

  - [~] 3.8 Write property tests for link and expiry utilities (Properties 11, 13)
    - **Property 11: Presigned URL expiry detection** — For any two timestamps, returns true when elapsed > 50 minutes, false otherwise
    - **Validates: Requirements 7.10**
    - **Property 13: Run ID to URL link generation** — For any `{source_id}#{run_date}` string, produces `/runs/{source_id}/{run_date}`; for null/undefined, returns null
    - **Validates: Requirements 7.16**

- [~] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement shared UI components
  - [~] 5.1 Create shared UI components
    - Create `src/components/LoadingSpinner.tsx` — spinner displayed while data is loading
    - Create `src/components/ErrorAlert.tsx` — displays API error message with a "Retry" button that calls a provided `onRetry` callback
    - Create `src/components/ScoreBadge.tsx` — uses `getScoreBadgeColor` to render color-coded relevance score badge
    - Create `src/components/StatusBadge.tsx` — renders tender/run status with appropriate color
    - Create `src/components/LoadMoreButton.tsx` — "Load more" button with loading state for cursor pagination
    - Create `src/components/StatCard.tsx` — key-value stat display card for run detail stats
    - _Requirements: 6.9, 6.15, 9.1_

- [ ] 6. Implement app shell and routing
  - [~] 6.1 Set up React Router with layout and navigation
    - Create `src/App.tsx` with `QueryClientProvider` and `BrowserRouter`
    - Create `src/layouts/AppLayout.tsx` with navigation bar containing links to `/runs` and `/tenders`, with active link highlighting
    - Configure routes: `/` redirects to `/tenders`, `/tenders`, `/tenders/:sourceId/:tenderId`, `/runs`, `/runs/:sourceId/:runDate`, `*` catch-all for 404
    - Create `src/pages/NotFoundPage.tsx` with "Page not found" message and link back to `/tenders`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [~] 6.2 Write property test for undefined routes (Property 4)
    - **Property 4: Undefined routes show 404 page** — For any URL path not matching defined routes, the router renders the "Page not found" component
    - **Validates: Requirements 3.4**

- [ ] 7. Implement TanStack Query hooks
  - [~] 7.1 Create data-fetching hooks
    - Create `src/hooks/useSources.ts` — `useQuery` wrapping `getSources()`
    - Create `src/hooks/useAllRuns.ts` — fetches sources, then fans out `getSourceRuns` per source, merges and sorts by date descending using `sortRunsByDate`
    - Create `src/hooks/useRunDetail.ts` — `useQuery` wrapping `getRunDetail(sourceId, runDate)`
    - Create `src/hooks/useRunTenders.ts` — `useInfiniteQuery` wrapping `getRunTenders` with `getNextPageParam` extracting `next_cursor`
    - Create `src/hooks/useTenders.ts` — `useInfiniteQuery` wrapping `getTenders` with filter/sort params and `getNextPageParam`
    - Create `src/hooks/useTenderDetail.ts` — `useQuery` wrapping `getTenderDetail(sourceId, tenderId)`
    - Create `src/hooks/useTenderDocuments.ts` — `useQuery` wrapping `getTenderDocuments`, tracks fetch timestamp for presigned URL expiry detection using `isPresignedUrlExpired`
    - _Requirements: 4.1, 5.1, 5.4, 5.5, 5.10, 6.1, 6.7, 7.1, 7.9, 7.10_

- [ ] 8. Implement Runs List Page
  - [~] 8.1 Build RunsListPage component
    - Create `src/pages/RunsListPage.tsx` using `useAllRuns` and `useSources`
    - Render table with columns: run date, source, status, collector stats, retriever stats
    - Add source filter dropdown populated from `useSources`
    - Apply `filterRunsBySource` for client-side source filtering
    - Display dash/empty indicator when collector or retriever stats are null
    - Make rows clickable, navigating to `/runs/:sourceId/:runDate`
    - Show `LoadingSpinner` while fetching, `ErrorAlert` on API failure
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [ ] 9. Implement Run Detail Page
  - [~] 9.1 Build RunDetailPage component
    - Create `src/pages/RunDetailPage.tsx` using `useRunDetail` and `useRunTenders` (×2 for discovered and processed phases)
    - Display collector result map as `StatCard` components: total found, new tenders, new pending, new skipped, duplicates, errors
    - Display retriever result map as `StatCard` components: processed, successful, failed, permanently failed, documents downloaded, documents failed
    - Render discovered and processed tender sections with tender title, status, and ID
    - Add "Load more" buttons for cursor pagination on both tender lists
    - Make tender rows clickable, navigating to `/tenders/:sourceId/:tenderId`
    - Show `LoadingSpinner` while fetching, handle 404 with "Run not found" message
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10_

- [~] 10. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement Tender List Page
  - [~] 11.1 Build TenderListPage component
    - Create `src/pages/TenderListPage.tsx` using `useTenders` and `useSources`
    - Render table with columns: title, organization, status, relevance score (using `ScoreBadge`), budget (using `formatBudget`), deadline, location, source, discovered date
    - Add filter bar: status dropdown (all/pending/completed/failed/permanently_failed/skipped), source dropdown, date range pickers (discovered_from/discovered_to), analyzed toggle (all/analyzed/unanalyzed)
    - Implement sort controls: discovered date (default, server-side), relevance score (server-side via `sort_by=relevance_score`), budget and deadline (client-side via `sortTendersClientSide`)
    - Add "Load more" button at bottom when `next_cursor` is present
    - Make rows clickable, navigating to `/tenders/:sourceId/:tenderId`
    - Show `LoadingSpinner` while fetching, `ErrorAlert` on API failure
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12, 6.13, 6.14, 6.15_

- [ ] 12. Implement Tender Detail Page
  - [~] 12.1 Build TenderDetailPage component
    - Create `src/pages/TenderDetailPage.tsx` using `useTenderDetail` and `useTenderDocuments`
    - Render metadata section: title, organization, budget (`formatBudget`), deadline, location, sectors, types, posted date, status, status name
    - Render scraper status section: status, retry count, last attempt, last error, documents downloaded/failed, skip reason
    - Conditionally render analysis section (when `analyzed_at` is not null): summary, context, relevance score (`ScoreBadge`), tags, tender type, model, analyzed at
    - Conditionally render requirements sections: experts (international, local, key experts, total, notes), references (count, type, value EUR, timeline years, notes), turnover (annual EUR, years, notes)
    - Render description section when `description_text` is present
    - Render documents section: filename, size, download link using presigned URL; trigger re-fetch via `useTenderDocuments` when URL may be expired
    - Render warnings alert banner when `warnings` array is non-empty
    - Render run links using `runIdToUrl` for `discovered_run_id` and `processed_run_id`
    - Handle 404 with "Tender not found" message, show `LoadingSpinner` while fetching
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 7.13, 7.14, 7.15, 7.16_

  - [~] 12.2 Write property test for warnings rendering (Property 12)
    - **Property 12: All warnings rendered** — For any tender with a non-empty `warnings` array, the rendered output contains every warning string
    - **Validates: Requirements 7.12**

- [ ] 13. Implement error handling patterns
  - [~] 13.1 Add error handling to all pages
    - Ensure each page uses TanStack Query's `isError` and `error` states to render `ErrorAlert`
    - Display human-readable messages: "API key is invalid or missing" for 403, "Server error, please retry" for 500, "API is unreachable" for network failures
    - Wire "Retry" button to TanStack Query's `refetch()` on every page
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 14. Static build configuration
  - [~] 14.1 Configure production build for S3 + CloudFront hosting
    - Verify `vite build` produces static output in `dist/`
    - Add a note or script for CloudFront error page configuration (serve `index.html` for all non-asset paths to support client-side routing)
    - _Requirements: 8.1, 8.2, 8.3_

- [~] 15. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (13 properties total)
- Unit tests validate specific examples and edge cases
- The build order follows: repo setup → API client → utilities → shared components → app shell → hooks → runs pages → tender pages → error handling → deployment config
