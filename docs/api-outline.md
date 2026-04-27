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
- Allowed methods: `GET`, `PUT`, `OPTIONS`
- Allowed headers: `x-api-key`, `Content-Type`
- OPTIONS preflight is handled at API Gateway level (no auth required)

Your fetch calls just need the `x-api-key` header:

```ts
const API_BASE = "https://sj7ac51cyi.execute-api.eu-south-2.amazonaws.com";
const headers = { "x-api-key": import.meta.env.VITE_API_KEY, "Content-Type": "application/json" };

async function apiFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(path, API_BASE);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });
  }
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(new URL(path, API_BASE).toString(), {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}
```

## Response Envelopes

All list endpoints return:

```ts
interface PaginatedResponse<T> {
  items: T[];
  count: number;               // items in this page
  total_count: number | null;  // total items matching filters (before pagination); null when unavailable
  page: number;                // current page number (1-based)
  total_pages: number | null;  // total number of pages; null when unavailable
  next_cursor: string | null;  // backward-compatible cursor; non-null when more pages exist
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

Offset-based. Use `page` (1-based) and `page_size` to navigate results.

- `page_size` — 1 to 100, default 20
- `page` — 1-based page number, default 1
- Response includes `total_count` and `total_pages` for building pagination UI
- `next_cursor` is included for backward compatibility but pagination is driven by `page`

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
| `sort_by` | string | — | `relevance_score`, `budget`, or `deadline`; omit for default `discovered_at` desc. Returns 400 for invalid values |
| `sort_direction` | string | `desc` | `asc` or `desc`. Applies to `sort_by` field; nulls always sort last regardless of direction |
| `page_size` | int | 20 | 1–100 |
| `page` | int | 1 | Page number (1-based) |

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
  currency: string | null;     // original currency code, e.g. "EUR", "USD"
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
GET /tenders?sort_by=deadline&sort_direction=asc
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
  description_text: string | null;     // plain text description from S3 (loaded for all completed tenders)
  warnings: string[];                  // non-fatal issues (e.g. missing S3 objects)
  // Detail-only analysis fields
  analysis_context: string | null;
  analysis_model: string | null;
  emailed_at: string | null;
  experts_required: object | null;     // {international, local, key_experts, total, notes}
  references_required: object | null;  // {count, type, value_eur, timeline_years, notes}
  turnover_required: object | null;    // {annual_eur, years, notes}
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

### GET /settings

List all settings. Returns only items that exist in the database (missing items are omitted, not returned as null).

Response:

```ts
interface SettingsListResponse {
  items: SettingResponse[];
  count: number;  // equals items.length
}
```

When no settings exist, returns `{ items: [], count: 0 }`.

---

### GET /settings/{setting_type}

Get a single setting. Valid types: `selection-criteria`, `analysis`, `company-profile`, `recipients`.

Response: `SettingResponse` (see below). Returns 404 if the setting doesn't exist, 400 if the type is invalid.

---

### PUT /settings/{setting_type}

Full replacement of a setting. The `updated_at` field is set server-side (any client-provided value is ignored).

Request bodies per type:

**selection-criteria:**
```json
{
  "min_budget_eur": 20000,
  "max_budget_eur": 2000000,
  "min_days_publish_to_deadline": 5,
  "locations_include": ["europe", "Global"],
  "status_include": ["open"]
}
```

**analysis:**
```json
{
  "score_threshold_for_email": 5,
  "max_tenders_per_run": 1000,
  "scoring_criteria": ["sector fit", "geographic fit"]
}
```

**company-profile:**
```json
{
  "company_name": "Acme Corp",
  "description": "Environmental consultancy",
  "focus_areas": ["waste management"],
  "preferred_regions": ["Eastern Europe"],
  "typical_budget_range": { "min_eur": 50000, "max_eur": 2000000 },
  "typical_team_size": "3-10 experts"
}
```

**recipients:**
```json
{
  "recipients": ["user@example.com"]
}
```

Response: `SettingResponse` with server-set `updated_at`. Returns 400 for invalid type or validation errors.

```ts
interface SettingResponse {
  setting_type: string;
  updated_at: string;  // ISO 8601 UTC, server-set
  // ... all fields from the corresponding request body
}
```

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

Paginated run list, newest first. Params: `page_size`, `page`.

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

Tenders linked to a run. Param: `phase=discovered|processed` (default: `discovered`), plus `page_size`, `page`.

## Error Handling

| Status | Meaning |
|--------|---------|
| 400 | Invalid query params (bad `sort_by`, empty `source_id`) |
| 404 | Tender, run, source, or document not found |
| 403 | Invalid or missing `x-api-key` |
| 500 | Internal server error |

All errors return `{"detail": "...", "status_code": N}`.

## Sorting Behavior

- Default: `discovered_at` descending (newest first) — `sort_direction` applies to all sort fields including the default
- `sort_by=relevance_score`: score order, nulls sort last. Default direction: `desc`
- `sort_by=budget`: numeric order, `0` (not specified) treated as null and sorts last. Default direction: `desc`
- `sort_by=deadline`: ISO date string order, nulls sort last. Default direction: `desc`
- All three support `sort_direction=asc` or `sort_direction=desc`
- Any other `sort_by` value returns 400

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
- `experts_required` — structured extraction: `{international, local, key_experts, total, notes}`
- `references_required` — structured extraction: `{count, type, value_eur, timeline_years, notes}`
- `turnover_required` — structured extraction: `{annual_eur, years, notes}`

## Presigned URL Expiry

Document download URLs expire after 1 hour. If a user stays on a detail page longer than that, re-fetch the document list to get fresh URLs.
