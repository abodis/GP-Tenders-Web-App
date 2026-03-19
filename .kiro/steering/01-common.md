---
inclusion: always
description: "Project conventions and standards"
keywords: ["conventions", "standards", "common"]
---

# System Context

This app (`rfp-web`) is one of three components in the GPTenders platform, a tender discovery and evaluation system built for Green Partners, a Romanian environmental consultancy.

## Platform Components

| Component | Repo | Runtime | Purpose |
|-----------|------|---------|---------|
| Scraper | `rfp-scraper` (separate repo) | ECS Fargate Spot, nightly | Discovers tenders from DevelopmentAid, fetches detail pages and documents, stores in DynamoDB + S3 |
| Analyzer | `rfp-analyzer` (separate repo) | Step Functions + 3 Lambdas, daily | Scores tenders for relevance via LLM (Fireworks Llama 70B / Bedrock Haiku), sends email digest via SES |
| Web App | `rfp-web` (this repo) | S3 + CloudFront SPA | Browse tenders, review analysis, monitor scraper runs |

All three share a single DynamoDB table (`rfp-tenders`) and S3 bucket (`novare-rfp-scraper-data-dev`). The scraper owns the REST API; the web app and analyzer are read-only API consumers. The analyzer writes analysis fields directly to DynamoDB (never through the API).

## Data Flow

```
DevelopmentAid ──scraper──→ DynamoDB + S3
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
               Analyzer    Web App    API (read)
              (LLM score)  (this app)
                 │
                 ├──→ DynamoDB (analysis fields)
                 └──→ SES (email digest)
```

## Tender Lifecycle

1. Scraper discovers tender → inserts as `pending` (or `skipped` if ineligible)
2. Scraper fetches detail → `completed` (or `failed` → retry up to 5x → `permanently_failed`)
3. Analyzer picks up `completed` tenders → applies selection filter (budget/deadline) → LLM analysis → writes `relevance_score` (1–10), `analysis_summary`, `analysis_tags`, `tender_type`, etc.
4. Tenders filtered out pre-LLM get `relevance_score: 0`, `analysis_model: "selection-filter"`
5. Email digest includes tenders scoring ≥ 5 (configurable threshold)

## API Shape (consumed by this app)

- Base URL: env var `VITE_API_BASE_URL`, auth via `x-api-key` header
- All list endpoints return `{ items, count, total_count, next_cursor }` — cursor-based pagination
- Key endpoints: `GET /tenders` (filterable by status, date range, score, tender_type, analyzed, fully_visible; sortable by relevance_score, budget, deadline), `GET /tenders/{source_id}/{tender_id}` (full detail + description_text), `GET /tenders/.../documents` (presigned S3 URLs, 1h expiry), `GET /sources/`, `GET /sources/{source_id}/runs`
- Analysis fields on tenders are nullable — unanalyzed tenders have `null` scalars and `[]` for `analysis_tags`
- `budget: 0` means "not specified", not zero EUR
- Document URLs expire after 1 hour; re-fetch if stale

## Key Domain Concepts

- `fully_visible`: free tenders (true) vs locked/paid tenders (false) on DevelopmentAid
- `tender_type`: `request_to_participate` | `expression_of_interest` | `full_proposal` — set by analyzer
- `relevance_score`: 0 = filtered out pre-LLM, 1–10 = LLM-assigned relevance to Green Partners' profile
- Analysis detail fields (experts_required, references_required, turnover_required): structured extraction of bid eligibility requirements, each has a `notes` field that should be shown as primary content
- Scraper runs have two phases: collection (discover new tenders) and retrieval (fetch details), tracked via `collector_result` and `retriever_result`

# Project Conventions

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 |
| Build tool | Vite 8 |
| Language | TypeScript 5.9 (strict) |
| Styling | Tailwind CSS 4 |
| Components | shadcn/ui (base-nova style) |
| Data fetching | TanStack Query v5 |
| Routing | React Router v6 |
| Testing | Vitest 4 + fast-check + @testing-library/react + msw |
| Hosting | S3 + CloudFront |

## Code Standards

- TypeScript strict mode — no `any` types
- Path alias: `@/*` maps to `src/*`
- All API calls go through `apiFetch` in `src/api/client.ts`
- Server state managed exclusively by TanStack Query — no Redux/Zustand
- UI state is local `useState` only
- Cursor-based pagination with "Load more" buttons (no page numbers)
- Client-side sorting only for fields the API doesn't support server-side

## Naming Conventions

- Files: kebab-case (e.g. `tender-list-page.tsx`) — exception: existing PascalCase page/component files
- Components: PascalCase
- Functions/hooks: camelCase
- Constants: UPPER_SNAKE_CASE
- Custom hooks: `use` prefix, one per file in `src/hooks/`

## Project Structure

```
src/
├── api/          # API client, endpoints, types
├── assets/       # Static assets (images, SVGs)
├── components/   # Shared UI components
│   └── ui/       # shadcn/ui primitives
├── hooks/        # TanStack Query custom hooks
├── layouts/      # App shell / layout components
├── lib/          # Utility libraries (cn, etc.)
├── pages/        # Route page components
├── test/         # Test setup
└── utils/        # Pure utility functions
```

## Anti-Patterns (grows via reflection)

- **Mismatched API return types**: `getSources()` is typed as `Promise<SourceListItem[]>` but the API actually returns a paginated wrapper `{items: [...]}`. The `useSources` hook normalizes this via `select`. When adding new endpoints, verify the actual response shape matches the TypeScript type.
- **Removing UI features instead of fixing data flow**: When list data is missing fields, check whether the API already provides them (or can trivially be updated to) before stripping columns from the UI.
- **Displaying structured data over human-readable notes**: When API fields include both numeric/structured data and a `notes` field, prefer showing notes as the primary visible content. The structured data (counts, amounts, years) should be secondary (tooltip/hover). Notes capture the human-readable requirement; numbers are for verification.
- **@base-ui/react import casing**: Subpath imports from `@base-ui/react` use lowercase module names (e.g. `@base-ui/react/tooltip`, `@base-ui/react/dialog`), not PascalCase. PascalCase paths will fail at build/test time with "not exported" errors.
