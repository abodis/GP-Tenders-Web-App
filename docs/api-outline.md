# RFP Scraper API — Web App Integration Guide

Quick reference for the `rfp-web` React SPA. Covers authentication, CORS, endpoints, pagination, filtering, and response shapes.

## Connection

| | |
|---|---|
| Base URL | `https://sj7ac51cyi.execute-api.eu-south-2.amazonaws.com` |
| Auth | `x-api-key` header (value stored in SSM `/rfp-scraper/api-key`, eu-south-2) |
| Protocol | HTTPS only, JSON responses |
| OpenAPI docs | `{base_url}/docs` (requires auth) |

## CORS

The API allows cross-origin requests from any origin. Configuration:

- `Access-Control-Allow-Origin: *`
- Allowed methods: `GET`, `OPTIONS`
- Allowed headers: `x-api-key`, `Content-Type`
- OPTIONS preflight is handled at API Gateway level (no auth required)

Your fetch calls just need the `x-api-key` header:

```ts
const API_BASE = "https://sj7ac51cyi.execute-api.eu-south-2.amazonaws.com";

async function apiFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(path, API_BASE);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });
  }
  const res = await fetch(url.toString(), {
    headers: { "x-api-key": import.meta.env.VITE_API_KEY },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json();
}
```

## Response Envelopes

All list endpoints return:

```ts
interface PaginatedResponse<T> {
  items: T[];
  count: number;          // items in this page
  next_cursor: string | null; // pass as ?cursor= for next page
}
```

All errors return:

```ts
interface ErrorResponse {
  detail: string;
  status_code: number;
}
```

## Pagination

Cursor-based. Pass `next_cursor` from the previous response as `?cursor=` to get the next page. When `next_cursor` is `null`, there are no more pages.

- `page_size` — 1 to 100, default 20
- Cursors are opaque base64 strings; don't parse them

When querying all sources (no `source_id`), the cursor format is different internally. Don't mix cursors between single-source and cross-source queries.

## Endpoints

### GET /health

No auth required. Returns `{"status": "healthy"}` or 503.

---

### GET /tenders

Primary endpoint for the web app. Paginated tender list with filtering and sorting.

Query params:

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `source_id` | string | all sources | Omit to query all configured sources |
| `discovered_from` | ISO date | — | Lower bound on `discovered_at` |
| `discovered_to` | ISO date | — | Upper bound on `discovered_at` |
| `status` | string | — | `pending`, `completed`, `failed`, `permanently_failed`, `skipped` |
| `fully_visible` | bool | — | `true` = free tenders only |
| `analyzed` | bool | — | `true` = analyzed only, `false` = unanalyzed only |
| `min_score` | int | — | Minimum `relevance_score` (0–10) |
| `tender_type` | string | — | Exact match: `request_to_participate`, `expression_of_interest`, `full_proposal` |
| `sort_by` | string | — | Only `relevance_score` supported; omit for default `discovered_at` desc. Returns 400 for invalid values |
| `page_size` | int | 20 | 1–100 |
| `cursor` | string | — | Pagination token |

Response item shape:

```ts
interface TenderListItem {
  source_id: string;
  tender_id: string;
  title: string;
  posted_date: string;        // ISO date
  deadline: string | null;     // ISO date
  discovered_at: string;       // ISO datetime
  status: string;
  fully_visible: boolean;
  budget: number;              // EUR, 0 = not specified
  status_name: string | null;  // "open", "closed", "awarded"
  location_names: string | null;
  sectors: string | null;
  types: string | null;
  documents_total: number;
  // Analysis fields (null if not yet analyzed)
  relevance_score: number | null;  // 0–10
  analysis_summary: string | null;
  analysis_tags: string[];         // empty array if unanalyzed
  tender_type: string | null;
  analyzed_at: string | null;      // ISO datetime
  organization: string | null;
}
```

Example calls:

```
GET /tenders?discovered_from=2026-03-01&discovered_to=2026-03-17&page_size=50
GET /tenders?analyzed=true&min_score=6&sort_by=relevance_score
GET /tenders?source_id=developmentaid-org&status=completed&fully_visible=true
GET /tenders?tender_type=full_proposal&analyzed=true
```

---

### GET /tenders/{source_id}/{tender_id}

Full tender detail. Returns all `TenderListItem` fields plus:

```ts
interface TenderDetailResponse extends TenderListItem {
  pk: string;                          // "source_id#tender_id"
  retry_count: number;
  last_attempt: string | null;
  last_error: string | null;
  s3_prefix: string | null;
  documents_downloaded: number;
  documents_failed: number;
  skip_reason: string | null;
  discovered_run_id: string | null;
  processed_run_id: string | null;
  detail: object | null;               // raw source API response from S3
  description_text: string | null;     // plain text description
  warnings: string[];                  // non-fatal issues (e.g. missing S3 objects)
  // Detail-only analysis fields
  analysis_context: string | null;
  analysis_model: string | null;
  emailed_at: string | null;
  experts_required: object | null;     // {count, categories}
  references_required: object | null;  // {count, min_value_eur}
  turnover_required: object | null;    // {min_annual_eur, years}
}
```

---

### GET /tenders/{source_id}/{tender_id}/documents

Document list with presigned S3 download URLs (1-hour expiry).

```ts
interface DocumentItem {
  filename: string;
  url: string;          // presigned S3 URL, expires in 1 hour
  size_bytes: number | null;
}
```

---

### GET /tenders/{source_id}/{tender_id}/documents/{filename}

Single document presigned URL: `{"filename": "...", "url": "..."}`.

---

### GET /sources/

List of configured scraping sources (sanitized, no secrets).

```ts
interface SourceListItem {
  source_id: string;
  enabled: boolean;
  base_url: string;
}
```

---

### GET /sources/{source_id}

Full source config (sanitized). Includes `api_endpoints`, `auth` (no secrets), `proxy` (no URLs), `throttle`, `searches`, `daily_detail_limit`, `eligibility_defaults`.

---

### GET /sources/{source_id}/runs

Paginated run list, newest first. Params: `page_size`, `cursor`.

Both the list and detail endpoints return the same shape:

```ts
interface RunItem {
  pk: string;
  source_id: string;
  run_date: string;
  started_at: string;
  completed_at: string | null;
  status: string;  // "running", "success", "partial_failure", "failed"
  collector_result: {
    total_found: number;
    new_tenders: number;
    new_pending: number;
    new_skipped: number;
    duplicates: number;
    errors: number;
  } | null;
  retriever_result: {
    processed: number;
    successful: number;
    failed: number;
    permanently_failed: number;
    documents_downloaded: number;
    documents_failed: number;
  } | null;
}
```

---

### GET /sources/{source_id}/runs/{run_date}

Single run. Returns the same `RunItem` shape as the list endpoint above.

---

### GET /sources/{source_id}/runs/{run_date}/tenders

Tenders linked to a run. Param: `phase=discovered|processed` (default: `discovered`), plus `page_size`, `cursor`.

## Error Handling

| Status | Meaning |
|--------|---------|
| 400 | Invalid query params (bad `sort_by`, empty `source_id`, malformed cursor) |
| 404 | Tender, run, source, or document not found |
| 403 | Invalid or missing `x-api-key` |
| 500 | Internal server error |

All errors return `{"detail": "...", "status_code": N}`.

## Sorting Behavior

- Default: `discovered_at` descending (newest first)
- `sort_by=relevance_score`: descending score, tenders with `null` score sort last
- No other sort fields are currently supported

## Analysis Fields

Analysis fields are written by the separate `rfp-analyzer` service. They're nullable — unanalyzed tenders have `null` for scalar fields and `[]` for `analysis_tags`.

- `relevance_score` — 0 to 10 integer
- `analysis_summary` — AI-generated one-paragraph summary
- `analysis_tags` — classification labels (e.g. `["statistics", "capacity-building"]`)
- `tender_type` — `request_to_participate`, `expression_of_interest`, or `full_proposal`
- `analyzed_at` — ISO datetime when analysis completed
- `organization` — abbreviated donor name (set by scraper at insert time, not the analyzer)

Detail-only fields (only on `GET /tenders/{source_id}/{tender_id}`):
- `analysis_context` — context/keywords used for analysis
- `analysis_model` — LLM model identifier
- `emailed_at` — when the tender was included in an email digest
- `experts_required` — structured extraction: `{count, categories}`
- `references_required` — structured extraction: `{count, min_value_eur}`
- `turnover_required` — structured extraction: `{min_annual_eur, years}`

## Presigned URL Expiry

Document download URLs expire after 1 hour. If a user stays on a detail page longer than that, re-fetch the document list to get fresh URLs.
