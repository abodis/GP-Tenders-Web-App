# RFP Web App v1 Brainstorm

## What We're Building

A lightweight internal web app for browsing scraper operations (runs, stats) and reviewing tender results with analysis scores. Pure SPA consuming the existing scraper REST API — no backend to build.

## Two Use Cases

1. **Scraper Operations** — View scrape runs, see collection/retrieval stats, understand what the scraper is doing
2. **Tender Results Browser** — List all collected tenders, see analysis results (scores, summaries, tags), drill into details

## Key Decisions Made

- **App structure**: Two-section SPA with client-side routing (🟢 80%) — `/runs/*` and `/tenders/*` with shared layout. Deep-linkable URLs for sharing specific runs or tenders.
- **Tech stack**: React + Vite + TypeScript on S3/CloudFront (🟢 75%) — Already decided in system-expansion doc. Near-zero hosting cost, modern DX, TypeScript for API type safety.
- **UI components**: Tailwind CSS + shadcn/ui (🟢 65%) — Clean data-heavy UI with TanStack Table for sortable/filterable tables. No heavy framework lock-in.
- **Auth (v1)**: API key in env config (🟢 75%) — Embedded at build time, sent as `x-api-key` header. Zero auth infrastructure. Cognito upgrade path exists for later.
- **Data fetching**: TanStack Query (🟢 80%) — Handles cursor-based pagination, caching, loading/error states. Standard choice for API-consumer SPAs.
- **Landing page**: Tender list as default (🟢 65%) — Primary use case is reviewing tenders, not debugging the scraper. Runs accessible via nav.

## Pages (v1 Scope)

### Scraper Operations Section (`/runs`)

**Runs List** (`/runs`)
- Table: date, source, status, collector stats (found/new/skipped/duplicates), retriever stats (processed/successful/failed)
- Filter by source
- Sorted by date descending (newest first)
- API: `GET /sources/{source_id}/runs` (per source)

**Run Detail** (`/runs/:sourceId/:runDate`)
- Full collector + retriever result maps
- Link to tenders discovered in this run
- Link to tenders processed in this run
- API: `GET /sources/{source_id}/runs/{run_date}`, `GET /sources/{source_id}/runs/{run_date}/tenders?phase=discovered`, `GET /sources/{source_id}/runs/{run_date}/tenders?phase=processed`

### Tender Results Section (`/tenders`)

**Tender List** (`/tenders`) — DEFAULT LANDING PAGE
- Table: title, organization, status, relevance_score, budget, deadline, location, source, discovered_at
- Filters: status (completed/pending/failed/skipped), source, date range, analyzed (yes/no)
- Sort: by score (desc), date, budget, deadline
- Score displayed as color-coded badge (green ≥7, yellow 4-6, red ≤3, gray = unanalyzed)
- API: `GET /tenders` with query params

**Tender Detail** (`/tenders/:sourceId/:tenderId`)
- Metadata: title, organization, budget, deadline, location, sectors, types, posted_date
- Scraper status: status, retry_count, last_attempt, last_error, documents_downloaded/failed
- Analysis (if analyzed): summary, context, relevance_score, tags, tender_type, experts_required, references_required, turnover_required, analysis_model, analyzed_at
- Documents list with download links (presigned URLs)
- API: `GET /tenders/{source_id}/{tender_id}`, `GET /tenders/{source_id}/{tender_id}/documents`

## Constraints Discovered

1. ~~**CORS**~~ — RESOLVED. API has `Access-Control-Allow-Origin: *` with GET/OPTIONS.
2. **API key exposure**: The API key will be visible in browser dev tools. Acceptable for an internal tool with <5 users. Rate limiting on API Gateway provides a safety net.
3. **No analysis write-back**: The web app is read-only. No ability to manually override scores or add notes. This is fine for v1.
4. **Cursor-based pagination**: The API uses opaque cursor tokens, not page numbers. TanStack Query's `useInfiniteQuery` handles this well, but the UI should use "Load more" or infinite scroll rather than page number navigation. Don't mix cursors between single-source and cross-source queries.
5. **Cross-source runs**: The runs API is per-source (`/sources/{source_id}/runs`). To show all runs across sources, the app needs to fetch from each source and merge client-side. Currently there's only one source (developmentaid-org), so this is trivial — but the code should anticipate multiple sources.
6. ~~**Analysis fields on tender list items**~~ — RESOLVED. `GET /tenders` now returns `relevance_score`, `analysis_summary`, `analysis_tags`, `tender_type`, `analyzed_at` on list items.
7. **Presigned URL expiry**: Document download URLs expire after 1 hour. If a user stays on a detail page longer than that, re-fetch the document list for fresh URLs.
8. **Sorting limitations**: Only `relevance_score` and default `discovered_at` desc are supported server-side. Any other sort (budget, deadline) would need to be client-side on the loaded page of results.

## Integration Points

- **Scraper REST API**: The only backend. All data comes from here. Base URL + API key needed at build time.
- **S3 + CloudFront**: Hosting for the static SPA build artifacts.
- **Presigned S3 URLs**: Document downloads go through presigned URLs returned by the API (1-hour expiry).

## API Endpoints Used

| Page | Endpoint | Notes |
|------|----------|-------|
| Runs List | `GET /sources/` | Get list of sources to iterate |
| Runs List | `GET /sources/{source_id}/runs` | Per-source, paginated |
| Run Detail | `GET /sources/{source_id}/runs/{run_date}` | Single run stats |
| Run Detail | `GET /sources/{source_id}/runs/{run_date}/tenders?phase=discovered` | Tenders found in run |
| Run Detail | `GET /sources/{source_id}/runs/{run_date}/tenders?phase=processed` | Tenders retrieved in run |
| Tender List | `GET /tenders` | Paginated, filtered |
| Tender Detail | `GET /tenders/{source_id}/{tender_id}` | Full detail + description |
| Tender Detail | `GET /tenders/{source_id}/{tender_id}/documents` | Document list with presigned URLs |

## Resolved Questions

- [x] CORS — Implemented. `Access-Control-Allow-Origin: *`, allowed methods GET/OPTIONS, allowed headers `x-api-key`/`Content-Type`.
- [x] Analysis fields on list endpoint — Yes. `GET /tenders` returns `relevance_score`, `analysis_summary`, `analysis_tags`, `tender_type`, `analyzed_at` on every list item (nullable for unanalyzed tenders).
- [x] Skipped tenders — Show by default. Filter to hide them can come later.
- [x] Build priority — Runs first, then tenders.
- [x] Tech stack — React + Vite + TypeScript + Tailwind + shadcn/ui confirmed.
- [x] API reference — Full outline in `docs/api-outline.md` with TypeScript interfaces for all response shapes.

## Open Questions

- [ ] Custom domain or CloudFront URL for v1?
- [ ] Which source(s) are currently active? Just `developmentaid-org`?

## Build Order

1. Set up repo: Vite + React + TypeScript + Tailwind + shadcn/ui + TanStack Query
2. API client layer with TypeScript types matching `docs/api-outline.md`
3. App shell: layout, nav, routing
4. **Runs list page** (priority — scraper operations visibility)
5. **Run detail page** (stats + linked tenders)
6. Tender list page (results browser)
7. Tender detail page (full analysis + documents)
8. Deploy to S3 + CloudFront
