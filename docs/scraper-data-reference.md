# Scraper Data Reference

Reference for downstream consumers (analyzer, web app) describing what data the scraper produces, where it lives, and what the API returns.

## PostgreSQL: `tenders` Table

RDS PostgreSQL 16 instance (`db.t4g.small`), database `rfpdb`. Connection via `ThreadedConnectionPool`. Credentials resolved in order: (1) direct env vars (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`) — used by Lambda in VPC where Secrets Manager is unreachable; (2) Secrets Manager via `DB_SECRET_ARN` — used by ECS task which has internet access.

Primary key: `pk` = `{source_id}#{tender_id}` (TEXT)

Indexes:
- `idx_tenders_source_discovered` — `(source_id, discovered_at DESC)`
- `idx_tenders_source_status` — `(source_id, status)`
- `idx_tenders_relevance_score` — `(relevance_score DESC NULLS LAST)`
- `idx_tenders_deadline` — `(deadline NULLS LAST)`
- `idx_tenders_budget` — `(budget)`
- `idx_tenders_analyzed_at` — `(analyzed_at)`

### Columns

| Column | Type | Required | Set by | Notes |
|--------|------|----------|--------|-------|
| `pk` | TEXT | always | insert | `{source_id}#{tender_id}` |
| `source_id` | TEXT | always | insert | e.g. `"developmentaid-org"` |
| `tender_id` | TEXT | always | insert | Source-specific ID (numeric string) |
| `title` | TEXT | always | insert | Tender name |
| `posted_date` | TEXT | always | insert | ISO date, e.g. `"2026-03-15"` |
| `deadline` | TEXT | optional | insert | ISO date or null if open-ended |
| `discovered_at` | TIMESTAMPTZ | always | insert | Auto-generated |
| `status` | TEXT | always | insert/update | `pending` → `completed` / `failed` → `permanently_failed` / `blocked` / `skipped` |
| `retry_count` | INTEGER | always | insert (0) | Incremented on each failure |
| `fully_visible` | BOOLEAN | always | insert | `true` = free tender, `false` = locked (costs a credit) |
| `budget` | INTEGER | always | insert/update | EUR amount; `0` = not specified. Set at insert from search metadata, updated on detail retrieval |
| `currency` | TEXT | optional | update | Original currency code from detail API (e.g. `"EUR"`, `"USD"`); `null` if not specified |
| `organization` | TEXT | optional | insert | Abbreviated donor name |
| `location_names` | TEXT | optional | insert | Comma-separated, e.g. `"Romania, Moldova"` |
| `status_name` | TEXT | optional | insert | Source status label, e.g. `"open"`, `"closed"` |
| `sectors` | TEXT | optional | insert | e.g. `"Statistics and data analysis"` |
| `types` | TEXT | optional | insert | e.g. `"Consulting services"` |
| `documents_total` | INTEGER | always | insert | Number of attached documents (from search metadata) |
| `skip_reason` | TEXT | optional | insert | Why the tender was skipped (eligibility filter) |
| `discovered_run_id` | TEXT | optional | insert | `{source_id}#{run_date}` linking to the discovery run |
| `last_attempt` | TIMESTAMPTZ | optional | update | Timestamp of last retrieval attempt |
| `last_error` | TEXT | optional | update | Error message from last failed attempt |
| `s3_prefix` | TEXT | optional | update | Set on completion: `{source_id}/{tender_id}` |
| `documents_downloaded` | INTEGER | always | update | Count of successfully downloaded docs (default 0) |
| `documents_failed` | INTEGER | always | update | Count of failed doc downloads (default 0) |
| `processed_run_id` | TEXT | optional | update | `{source_id}#{run_date}` linking to the retrieval run |
| `relevance_score` | INTEGER | optional | analyzer | 0–10 relevance score |
| `analysis_summary` | TEXT | optional | analyzer | AI-generated summary |
| `analysis_tags` | TEXT[] | optional | analyzer | Classification tags (Postgres array, default `{}`) |
| `tender_type` | TEXT | optional | analyzer | e.g. `"request_to_participate"`, `"expression_of_interest"`, `"full_proposal"` |
| `analyzed_at` | TIMESTAMPTZ | optional | analyzer | When analysis completed |
| `analysis_context` | TEXT | optional | analyzer | Context used for analysis |
| `analysis_model` | TEXT | optional | analyzer | LLM model identifier |
| `emailed_at` | TIMESTAMPTZ | optional | analyzer | When email digest sent |
| `experts_required` | JSONB | optional | analyzer | `{international, local, key_experts, total, notes}` |
| `references_required` | JSONB | optional | analyzer | `{count, type, value_eur, timeline_years, notes}` |
| `turnover_required` | JSONB | optional | analyzer | `{annual_eur, years, notes}` |

### Status Lifecycle

```
insert (new tender)
  ├─ fully_visible=true OR passes eligibility → status="pending"
  └─ fails eligibility → status="skipped" (skip_reason set)

retriever picks up "pending", "failed", or "blocked" tenders:
  ├─ success → status="completed" (s3_prefix, documents_downloaded/failed set)
  ├─ credit exhaustion (429 + code 40) → status="blocked" (retry_count unchanged)
  └─ failure → status="failed" (retry_count++, last_error set)
       └─ retry_count >= 5 → status="permanently_failed"
```

## PostgreSQL: `scrape_runs` Table

Primary key: `pk` = `{source_id}#{run_date}` (TEXT)

If a run for the same `source_id` + `run_date` already exists, the row is overwritten (reset to `running` status with `completed_at`, `collector_result`, and `retriever_result` cleared). This supports multiple manual runs on the same day.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `pk` | TEXT | always | `{source_id}#{run_date}` |
| `source_id` | TEXT | always | |
| `run_date` | TEXT | always | ISO date |
| `started_at` | TIMESTAMPTZ | always | |
| `completed_at` | TIMESTAMPTZ | optional | Set when run finishes |
| `status` | TEXT | always | `running` → `completed` / `failed` |
| `collector_result` | JSONB | optional | See collector stats below |
| `retriever_result` | JSONB | optional | See retriever stats below |

Collector result map: `{total_found, new_tenders, new_pending, new_skipped, duplicates, errors}`

Retriever result map: `{processed, successful, failed, permanently_failed, documents_downloaded, documents_failed, blocked}`

## PostgreSQL: `settings` Table

Stores application settings (selection-criteria, analysis, company-profile, recipients).

Primary key: `pk` = `SETTINGS#{setting_type}` (TEXT)

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `pk` | TEXT | always | `SETTINGS#{setting_type}` |
| `data` | JSONB | always | Full setting payload (default `{}`) |
| `updated_at` | TIMESTAMPTZ | always | Server-set on each write |

## S3: `novare-rfp-scraper-data-dev`

For each completed tender, stored under `{source_id}/{tender_id}/`:

| Key | Content | Always present |
|-----|---------|----------------|
| `detail.json` | Raw API response from the detail endpoint (full JSON) | Yes (on completion) |
| `description.txt` | Plain-text extraction of `description_html` (HTML tags stripped) | Only if description_html is non-empty |
| `documents/{filename}` | Binary document files | Only if tender has downloadable documents |

`detail.json` contains the full developmentaid detail response including fields not stored in PostgreSQL: `description` (HTML), `contacts`, `organization` (full object with name/country), `documents` (array with id/name/size), and other source-specific metadata.

## API Endpoints

Base URL: `https://sj7ac51cyi.execute-api.eu-south-2.amazonaws.com`
Auth: `x-api-key` header (value in SSM `/rfp-scraper/api-key`, SecureString, eu-south-2)

### GET /tenders

Paginated tender list. Returns `{"items": [...], "count": N, "total_count": N, "page": N, "total_pages": N}`.

Query params:
- `source_id` (optional) — omit to query all sources
- `discovered_from` / `discovered_to` (optional) — ISO date range on `discovered_at`
- `status` (optional) — filter by status
- `fully_visible` (optional) — boolean filter
- `analyzed` (optional) — boolean, filter by analysis status
- `min_score` (optional) — integer, minimum relevance_score
- `tender_type` (optional) — string, exact match on tender_type
- `sort_by` (optional) — `relevance_score`, `budget`, or `deadline`; returns 400 for invalid values
- `sort_direction` (optional, default `desc`) — `asc` or `desc`
- `page_size` (optional, default 20, max 100)
- `page` (optional, default 1) — 1-based page number

Each item in `items`:

```json
{
  "source_id": "developmentaid-org",
  "tender_id": "123456",
  "title": "Consulting services for...",
  "posted_date": "2026-03-15",
  "deadline": "2026-04-20",
  "discovered_at": "2026-03-15T10:30:00",
  "status": "completed",
  "fully_visible": true,
  "budget": 500000,
  "status_name": "open",
  "location_names": "Romania, Moldova",
  "sectors": "Statistics and data analysis",
  "types": "Consulting services",
  "documents_total": 3,
  "relevance_score": 8,
  "analysis_summary": "Consulting services for statistical capacity building...",
  "analysis_tags": ["statistics", "capacity-building"],
  "tender_type": "full_proposal",
  "analyzed_at": "2026-03-16T14:30:00",
  "organization": "World Bank"
}
```

All fields except `deadline`, `status_name`, `location_names`, `sectors`, and `types` are always present. Those five are nullable.
`budget: 0` means "not specified" — not zero EUR.

### GET /tenders/{source_id}/{tender_id}

Full tender detail. Returns all fields from the list item plus:

```json
{
  "pk": "developmentaid-org#123456",
  "retry_count": 0,
  "last_attempt": "2026-03-15T11:00:00",
  "last_error": null,
  "s3_prefix": "developmentaid-org/123456",
  "documents_downloaded": 2,
  "documents_failed": 1,
  "skip_reason": null,
  "discovered_run_id": "developmentaid-org#2026-03-15",
  "processed_run_id": "developmentaid-org#2026-03-15",
  "detail": { "...raw detail.json from S3..." },
  "description_text": "Plain text description...",
  "warnings": ["Failed to load .../detail.json"],
  "relevance_score": 8,
  "analysis_summary": "Consulting services for statistical capacity building...",
  "analysis_tags": ["statistics", "capacity-building"],
  "tender_type": "full_proposal",
  "analyzed_at": "2026-03-16T14:30:00",
  "organization": "World Bank",
  "analysis_context": "Matched keywords: statistics, data analysis...",
  "analysis_model": "accounts/fireworks/models/llama-v3p1-70b-instruct",
  "emailed_at": "2026-03-16T15:00:00",
  "experts_required": {"international": 3, "local": 2, "key_experts": 2, "total": 5, "notes": "Senior governance expert required"},
  "references_required": {"count": 3, "type": "similar projects", "value_eur": 500000, "timeline_years": 5, "notes": "EU-funded projects preferred"},
  "turnover_required": {"annual_eur": 1000000, "years": 3, "notes": "Average annual turnover"}
}
```

Analysis fields are nullable — they are only present for tenders that have been processed by the analyzer service. Unanalyzed tenders will have `null` for scalar analysis fields and `[]` for `analysis_tags`.

- `detail` — full raw API response from S3 (null if not completed or S3 read fails)
- `description_text` — plain text extracted from HTML description (null if unavailable)
- `warnings` — list of non-fatal issues (e.g. missing S3 objects); empty array if none

### GET /tenders/{source_id}/{tender_id}/documents

Document list with presigned S3 download URLs (1-hour expiry).

```json
{
  "items": [
    {"filename": "terms_of_reference.pdf", "url": "https://s3.presigned...", "size_bytes": 245000}
  ],
  "count": 1,
  "next_cursor": null
}
```

### GET /tenders/{source_id}/{tender_id}/documents/{filename}

Single document presigned URL.

```json
{"filename": "terms_of_reference.pdf", "url": "https://s3.presigned..."}
```

### GET /sources/

List of configured sources (sanitized — no secrets).

### GET /sources/{source_id}

Full source config (sanitized).

### GET /sources/{source_id}/runs

Paginated run list, newest first.

### GET /sources/{source_id}/runs/{run_date}

Single run with collector/retriever statistics.

### GET /sources/{source_id}/runs/{run_date}/tenders

Tenders linked to a run. Query param `phase=discovered|processed` (default: discovered).

### GET /health

PostgreSQL connectivity check. No auth required.
