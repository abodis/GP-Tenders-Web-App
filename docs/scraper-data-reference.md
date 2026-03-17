# Scraper Data Reference

Reference for downstream consumers (analyzer, web app) describing what data the scraper produces, where it lives, and what the API returns.

## DynamoDB: `rfp-tenders` Table

Primary key: `pk` = `{source_id}#{tender_id}`

GSIs:
- `source-discovered-index` — partition: `source_id`, sort: `discovered_at`
- `source-status-index` — partition: `source_id`, sort: `status`

### Fields

| Field | Type | Required | Set by | Notes |
|-------|------|----------|--------|-------|
| `pk` | string | always | insert | `{source_id}#{tender_id}` |
| `source_id` | string | always | insert | e.g. `"developmentaid-org"` |
| `tender_id` | string | always | insert | Source-specific ID (numeric string) |
| `title` | string | always | insert | Tender name |
| `posted_date` | string | always | insert | ISO date, e.g. `"2026-03-15"` |
| `deadline` | string | optional | insert | ISO date or null if open-ended |
| `discovered_at` | string | always | insert | ISO datetime, auto-generated |
| `status` | string | always | insert/update | `pending` → `completed` / `failed` → `permanently_failed` / `skipped` |
| `retry_count` | int | always | insert (0) | Incremented on each failure |
| `fully_visible` | bool | optional | insert | `true` = free tender, `false` = locked (costs a credit) |
| `budget` | int | optional | insert | EUR amount; `0` = not specified |
| `organization` | string | optional | insert | Abbreviated donor name |
| `location_names` | string | optional | insert | Comma-separated, e.g. `"Romania, Moldova"` |
| `status_name` | string | optional | insert | Source status label, e.g. `"open"`, `"closed"` |
| `sectors` | string | optional | insert | e.g. `"Statistics and data analysis"` |
| `types` | string | optional | insert | e.g. `"Consulting services"` |
| `documents_total` | int | optional | insert | Number of attached documents (from search metadata) |
| `skip_reason` | string | optional | insert | Why the tender was skipped (eligibility filter) |
| `discovered_run_id` | string | optional | insert | `{source_id}#{run_date}` linking to the discovery run |
| `last_attempt` | string | optional | update | ISO datetime of last retrieval attempt |
| `last_error` | string | optional | update | Error message from last failed attempt |
| `s3_prefix` | string | optional | update | Set on completion: `{source_id}/{tender_id}` |
| `documents_downloaded` | int | optional | update | Count of successfully downloaded docs |
| `documents_failed` | int | optional | update | Count of failed doc downloads |
| `processed_run_id` | string | optional | update | `{source_id}#{run_date}` linking to the retrieval run |

### Status Lifecycle

```
insert (new tender)
  ├─ fully_visible=true OR passes eligibility → status="pending"
  └─ fails eligibility → status="skipped" (skip_reason set)

retriever picks up "pending" or "failed" tenders:
  ├─ success → status="completed" (s3_prefix, documents_downloaded/failed set)
  └─ failure → status="failed" (retry_count++, last_error set)
       └─ retry_count >= 5 → status="permanently_failed"
```

## DynamoDB: `scrape-runs` Table

Primary key: `pk` = `{source_id}#{run_date}`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `pk` | string | always | `{source_id}#{run_date}` |
| `source_id` | string | always | |
| `run_date` | string | always | ISO date |
| `started_at` | string | always | ISO datetime |
| `completed_at` | string | optional | Set when run finishes |
| `status` | string | always | `running` → `completed` / `failed` |
| `collector_result` | map | optional | See collector stats below |
| `retriever_result` | map | optional | See retriever stats below |

Collector result map: `{total_found, new_tenders, new_pending, new_skipped, duplicates, errors}`

Retriever result map: `{processed, successful, failed, permanently_failed, documents_downloaded, documents_failed}`

## S3: `novare-rfp-scraper-data-dev`

For each completed tender, stored under `{source_id}/{tender_id}/`:

| Key | Content | Always present |
|-----|---------|----------------|
| `detail.json` | Raw API response from the detail endpoint (full JSON) | Yes (on completion) |
| `description.txt` | Plain-text extraction of `description_html` (HTML tags stripped) | Only if description_html is non-empty |
| `documents/{filename}` | Binary document files | Only if tender has downloadable documents |

`detail.json` contains the full developmentaid detail response including fields not stored in DynamoDB: `description` (HTML), `contacts`, `organization` (full object with name/country), `documents` (array with id/name/size), and other source-specific metadata.

## API Endpoints

Base URL: `https://sj7ac51cyi.execute-api.eu-south-2.amazonaws.com`
Auth: `x-api-key` header (value in SSM `/rfp-scraper/api-key`, SecureString, eu-south-2)

### GET /tenders

Paginated tender list. Returns `{"items": [...], "count": N, "next_cursor": "..." | null}`.

Query params:
- `source_id` (optional) — omit to query all sources
- `discovered_from` / `discovered_to` (optional) — ISO date range on `discovered_at`
- `status` (optional) — filter by status
- `fully_visible` (optional) — boolean filter
- `page_size` (optional, default 20, max 100)
- `cursor` (optional) — opaque pagination token from previous response

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
  "documents_total": 3
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
  "warnings": ["Failed to load .../detail.json"]
}
```

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

DynamoDB connectivity check. No auth required.
