# Requirements Document

## Introduction

The RFP Web App v1 is a read-only internal single-page application for browsing scraper operations and reviewing tender results with analysis scores. It is built with React, Vite, TypeScript, Tailwind CSS, shadcn/ui, and TanStack Query, hosted as a static SPA on S3 + CloudFront. The app consumes the existing RFP Scraper REST API and provides two main sections: Scraper Operations (runs) and Tender Results Browser.

## Glossary

- **Web_App**: The React SPA that serves as the user interface for browsing scraper operations and tender results.
- **API_Client**: The module within the Web_App responsible for making authenticated HTTP requests to the Scraper REST API.
- **Scraper_API**: The existing REST API at `https://sj7ac51cyi.execute-api.eu-south-2.amazonaws.com` that provides tender data, run data, source data, and document download URLs.
- **Runs_List_Page**: The page at `/runs` displaying a table of scrape runs across all sources.
- **Run_Detail_Page**: The page at `/runs/:sourceId/:runDate` displaying full statistics and linked tenders for a single scrape run.
- **Tender_List_Page**: The page at `/tenders` displaying a filterable, sortable table of all collected tenders. This is the default landing page.
- **Tender_Detail_Page**: The page at `/tenders/:sourceId/:tenderId` displaying full metadata, analysis results, and documents for a single tender.
- **App_Shell**: The shared layout component containing the navigation bar, routing configuration, and page container.
- **Cursor_Pagination**: The pagination model used by the Scraper_API where an opaque `next_cursor` token is returned to fetch subsequent pages.
- **Relevance_Score**: An integer from 0 to 10 assigned by the analyzer pipeline indicating how relevant a tender is to the company. A score of 0 indicates the tender was filtered out by selection criteria before LLM analysis.
- **Presigned_URL**: A time-limited S3 download URL for tender documents, valid for 1 hour after generation.
- **Source**: A configured scraping source (e.g. `developmentaid-org`) from which tenders are collected.

## Requirements

### Requirement 1: Project Setup and Build Configuration

**User Story:** As a developer, I want a properly configured React + Vite + TypeScript project with Tailwind CSS, shadcn/ui, and TanStack Query, so that I can build the web app with a modern, type-safe stack.

#### Acceptance Criteria

1. THE Web_App SHALL use Vite as the build tool with React and TypeScript configured.
2. THE Web_App SHALL include Tailwind CSS for utility-first styling.
3. THE Web_App SHALL include shadcn/ui as the component library.
4. THE Web_App SHALL include TanStack Query for server state management and data fetching.
5. THE Web_App SHALL read the API base URL from the `VITE_API_BASE_URL` environment variable.
6. THE Web_App SHALL read the API key from the `VITE_API_KEY` environment variable.

### Requirement 2: API Client Layer

**User Story:** As a developer, I want a typed API client that handles authentication, pagination, and error responses, so that all pages can fetch data consistently.

#### Acceptance Criteria

1. THE API_Client SHALL send the API key as an `x-api-key` HTTP header on every request to the Scraper_API.
2. THE API_Client SHALL define TypeScript interfaces matching the Scraper_API response shapes for `TenderListItem`, `TenderDetailResponse`, `DocumentItem`, `SourceListItem`, `RunListItem`, `RunDetailResponse`, and `PaginatedResponse<T>`.
3. THE API_Client SHALL define TypeScript interfaces for the `ErrorResponse` shape containing `detail` and `status_code` fields.
4. WHEN the Scraper_API returns a non-2xx HTTP status, THE API_Client SHALL throw an error containing the `detail` message from the response body.
5. WHEN the Scraper_API returns a response that cannot be parsed as JSON, THE API_Client SHALL throw an error containing the HTTP status text.
6. THE API_Client SHALL support passing query parameters for filtering, sorting, and pagination to all list endpoints.

### Requirement 3: App Shell and Routing

**User Story:** As a user, I want a consistent layout with navigation between the Scraper Operations and Tender Results sections, so that I can move between the two areas of the app.

#### Acceptance Criteria

1. THE App_Shell SHALL display a navigation bar with links to the Runs_List_Page (`/runs`) and the Tender_List_Page (`/tenders`).
2. THE App_Shell SHALL use client-side routing to navigate between pages without full page reloads.
3. WHEN the user navigates to the root path (`/`), THE Web_App SHALL redirect to the Tender_List_Page (`/tenders`).
4. WHEN the user navigates to an undefined route, THE Web_App SHALL display a "Page not found" message with a link back to the Tender_List_Page.
5. THE App_Shell SHALL visually indicate which section (Runs or Tenders) is currently active in the navigation bar.

### Requirement 4: Runs List Page

**User Story:** As an operator, I want to see a list of all scrape runs across sources with their status and statistics, so that I can monitor scraper operations.

#### Acceptance Criteria

1. THE Runs_List_Page SHALL fetch the list of sources from `GET /sources/` and then fetch runs for each source from `GET /sources/{source_id}/runs`.
2. THE Runs_List_Page SHALL display runs in a table with columns: run date, source, status, collector stats (total found, new tenders, new pending, new skipped, duplicates, errors), and retriever stats (processed, successful, failed, permanently failed, documents downloaded, documents failed).
3. THE Runs_List_Page SHALL sort runs by date descending (newest first) after merging runs from all sources.
4. THE Runs_List_Page SHALL provide a source filter that allows the user to select a single source or view all sources.
5. WHEN collector or retriever stats are not yet available for a run, THE Runs_List_Page SHALL display a dash or empty indicator for those columns.
6. WHEN the user clicks a run row, THE Runs_List_Page SHALL navigate to the Run_Detail_Page for that run.
7. THE Runs_List_Page SHALL display a loading indicator while fetching run data.
8. IF the Scraper_API returns an error while fetching runs, THEN THE Runs_List_Page SHALL display an error message with the error detail.

### Requirement 5: Run Detail Page

**User Story:** As an operator, I want to see the full statistics and linked tenders for a specific scrape run, so that I can understand what happened during that run.

#### Acceptance Criteria

1. THE Run_Detail_Page SHALL fetch run details from `GET /sources/{source_id}/runs/{run_date}`.
2. THE Run_Detail_Page SHALL display the full collector result map: total found, new tenders, new pending, new skipped, duplicates, and errors.
3. THE Run_Detail_Page SHALL display the full retriever result map: processed, successful, failed, permanently failed, documents downloaded, and documents failed.
4. THE Run_Detail_Page SHALL fetch and display tenders discovered in the run from `GET /sources/{source_id}/runs/{run_date}/tenders?phase=discovered`.
5. THE Run_Detail_Page SHALL fetch and display tenders processed in the run from `GET /sources/{source_id}/runs/{run_date}/tenders?phase=processed`.
6. THE Run_Detail_Page SHALL display discovered and processed tenders in separate sections, each showing tender title, status, and tender ID.
7. WHEN the user clicks a tender in either list, THE Run_Detail_Page SHALL navigate to the Tender_Detail_Page for that tender.
8. THE Run_Detail_Page SHALL display a loading indicator while fetching data.
9. IF the Scraper_API returns a 404 for the run, THEN THE Run_Detail_Page SHALL display a "Run not found" message.
10. THE Run_Detail_Page SHALL support Cursor_Pagination for both the discovered and processed tender lists using "Load more" buttons.

### Requirement 6: Tender List Page

**User Story:** As a user, I want to browse all collected tenders with filtering and sorting, so that I can find relevant tenders and review their analysis scores.

#### Acceptance Criteria

1. THE Tender_List_Page SHALL fetch tenders from `GET /tenders` with Cursor_Pagination.
2. THE Tender_List_Page SHALL display tenders in a table with columns: title, organization, status, relevance score, budget, deadline, location, source, and discovered date.
3. THE Tender_List_Page SHALL provide a status filter with options: all, pending, completed, failed, permanently failed, skipped.
4. THE Tender_List_Page SHALL provide a source filter populated from `GET /sources/`.
5. THE Tender_List_Page SHALL provide a date range filter with "from" and "to" date inputs that filter on `discovered_at`.
6. THE Tender_List_Page SHALL provide an "analyzed" filter with options: all, analyzed only, unanalyzed only.
7. WHEN the user selects `sort_by=relevance_score`, THE Tender_List_Page SHALL pass `sort_by=relevance_score` to the Scraper_API for server-side sorting.
8. WHEN the user selects a sort field other than relevance score or discovered date, THE Tender_List_Page SHALL sort the currently loaded data client-side.
9. THE Tender_List_Page SHALL display the relevance score as a color-coded badge: green for scores 7 to 10, yellow for scores 4 to 6, red for scores 1 to 3, and gray for unanalyzed tenders (null score).
10. WHEN a tender has a budget value of 0, THE Tender_List_Page SHALL display "Not specified" instead of "€0".
11. THE Tender_List_Page SHALL use "Load more" buttons for Cursor_Pagination instead of page number navigation.
12. WHEN the user clicks a tender row, THE Tender_List_Page SHALL navigate to the Tender_Detail_Page for that tender.
13. THE Tender_List_Page SHALL display a loading indicator while fetching data.
14. IF the Scraper_API returns an error, THEN THE Tender_List_Page SHALL display an error message with the error detail.
15. WHEN a tender has a relevance score of 0, THE Tender_List_Page SHALL display the score as "Filtered" with a gray badge to indicate it was excluded by selection criteria before LLM analysis.

### Requirement 7: Tender Detail Page

**User Story:** As a user, I want to see the full details of a tender including metadata, analysis results, and downloadable documents, so that I can evaluate the tender thoroughly.

#### Acceptance Criteria

1. THE Tender_Detail_Page SHALL fetch tender details from `GET /tenders/{source_id}/{tender_id}`.
2. THE Tender_Detail_Page SHALL display tender metadata: title, organization, budget, deadline, location, sectors, types, posted date, status, and status name.
3. WHEN a tender has a budget value of 0, THE Tender_Detail_Page SHALL display "Not specified" instead of "€0".
4. THE Tender_Detail_Page SHALL display scraper processing information: status, retry count, last attempt timestamp, last error message, documents downloaded count, and documents failed count.
5. WHEN the tender has been analyzed (analyzed_at is not null), THE Tender_Detail_Page SHALL display analysis results: summary, context, relevance score, tags, tender type, analysis model, and analyzed at timestamp.
6. WHEN the tender has experts_required data, THE Tender_Detail_Page SHALL display the experts breakdown: international count, local count, key experts count, total count, and notes.
7. WHEN the tender has references_required data, THE Tender_Detail_Page SHALL display the references breakdown: count, type, value in EUR, timeline in years, and notes.
8. WHEN the tender has turnover_required data, THE Tender_Detail_Page SHALL display the turnover requirement: annual EUR amount, number of years, and notes.
9. THE Tender_Detail_Page SHALL fetch documents from `GET /tenders/{source_id}/{tender_id}/documents` and display each document with its filename, file size, and a download link using the Presigned_URL.
10. WHEN a document Presigned_URL has potentially expired (the user has been on the page for more than 50 minutes), THE Tender_Detail_Page SHALL re-fetch the document list to obtain fresh Presigned_URLs before initiating a download.
11. WHEN the tender has a description_text field, THE Tender_Detail_Page SHALL display the plain text description in a readable format.
12. WHEN the tender has warnings, THE Tender_Detail_Page SHALL display each warning message in a visible alert section.
13. IF the Scraper_API returns a 404 for the tender, THEN THE Tender_Detail_Page SHALL display a "Tender not found" message.
14. THE Tender_Detail_Page SHALL display a loading indicator while fetching data.
15. WHEN the tender has a skip_reason, THE Tender_Detail_Page SHALL display the skip reason in the status section.
16. THE Tender_Detail_Page SHALL display links to the discovery run and processing run (using discovered_run_id and processed_run_id) that navigate to the corresponding Run_Detail_Page.

### Requirement 8: Static Hosting and Deployment

**User Story:** As a developer, I want the app deployed as a static SPA on S3 + CloudFront, so that it is accessible over HTTPS with minimal hosting cost.

#### Acceptance Criteria

1. THE Web_App SHALL produce a static build output suitable for deployment to an S3 bucket.
2. THE Web_App SHALL support client-side routing by configuring CloudFront to serve `index.html` for all paths that do not match a static asset.
3. THE Web_App SHALL function correctly when served from a CloudFront distribution with HTTPS enabled.

### Requirement 9: Error Handling and Loading States

**User Story:** As a user, I want clear feedback when data is loading or when errors occur, so that I understand the current state of the application.

#### Acceptance Criteria

1. WHILE data is being fetched from the Scraper_API, THE Web_App SHALL display a loading indicator on the affected page section.
2. WHEN the Scraper_API returns a 403 error, THE Web_App SHALL display a message indicating the API key is invalid or missing.
3. WHEN the Scraper_API returns a 500 error, THE Web_App SHALL display a message indicating a server error occurred and suggest retrying.
4. WHEN a network request fails due to a connection error, THE Web_App SHALL display a message indicating the API is unreachable.
5. THE Web_App SHALL allow the user to retry a failed data fetch without navigating away from the current page.
