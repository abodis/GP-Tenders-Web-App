# RFP Scraper API — Web App Integration Guide

Quick reference for the `rfp-web` React SPA. Covers authentication, CORS, endpoints, pagination, filtering, and response shapes.

## Connection

| | |
|---|---|
| Base URL | `https://sj7ac51cyi.execute-api.eu-south-2.amazonaws.com` |
| Auth | `x-api-key` header (value stored in SSM `/rfp-scraper/api-key`, eu-south-2) |
| Protocol | HTTPS only, JSON responses |
| OpenAPI docs | `{base_url}/docs` (requires auth) |
| OpenAPI spec | `docs/openapi.yaml` (generated from FastAPI) |

## CORS

The API allows cross-origin requests from any origin. Configuration:

- `Access-Control-Allow-Origin: *`
- Allowed methods: `GET`, `PUT`, `POST`, `DELETE`, `OPTIONS`
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

async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(new URL(path, API_BASE).toString(), {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiDelete(path: string): Promise<void> {
  const res = await fetch(new URL(path, API_BASE).toString(), {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
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
| `min_interestingness` | int | — | Minimum `interestingness_score` (1–10) |
| `q` | string | — | Full-text search (max 500 chars); searches title, organization, sectors, location |
| `sort_by` | string | — | `relevance_score`, `budget`, `deadline`, `interestingness_score`, or `unified_score`; omit for default `discovered_at` desc. Returns 400 for invalid values |
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
  interestingness_score: number | null;
  interestingness_reasoning: string | null;
  unified_score: number | null;
}
```

**Search behavior:** When `q` is provided, results are ranked by full-text relevance (`ts_rank`) instead of the requested `sort_by`. Whitespace-only or empty `q` is ignored. Over 500 chars returns 400.

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
  team_requirements: object | null;    // extracted team roles (see POST extract-team)
  team_match_result: object | null;   // team match fitness scoring result (see POST team-match)
}
```

---

### GET /tenders/{source_id}/{tender_id}/audit

Return the audit trail for a tender — one record per scoring step, ordered by `created_at` descending.

Query params:

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `step` | string | — | Filter by step: `analysis`, `team_extraction`, `team_match`, `reference_extraction`, `reference_match`, `exclusion`, `interestingness`, `unified_score`. Invalid value → 400 |
| `run_id` | UUID | — | Filter by analysis run. Invalid UUID format → 400 |

Response: array of audit records.

```ts
interface AuditRecord {
  id: string;                   // UUID
  step: string;                 // scoring step name
  run_id: string | null;        // UUID of the analysis run
  created_at: string;           // ISO datetime
  input_snapshot: object;       // what went into the step (hashed text, metadata)
  output: object;               // what the step produced (scores, extractions)
  model: string | null;         // LLM model used (null for deterministic steps)
  model_version: string | null;
  duration_ms: number | null;   // wall-clock time for the step
}
```

Error responses:
- 400 — invalid `step` value or invalid `run_id` UUID format
- 404 — tender not found

---

### POST /tenders/{source_id}/{tender_id}/extract-team

Trigger team requirement extraction for a single tender. Reads documents from S3 (PDF, DOCX), prioritizes ToR documents, and extracts structured team requirements via LLM.

Preconditions: tender must be `completed` with an `s3_prefix`.

Response:

```ts
interface ExtractTeamResponse {
  team_requirements: TeamRequirement[];
  total_experts_required: number | null;
  extraction_confidence: "high" | "medium" | "low";
  extraction_source: "documents" | "description";  // which text was used
  documents_used: string[];                         // filenames read from S3
}

interface TeamRequirement {
  role: string;
  specializations: string[];
  mandatory: boolean;
  min_years: number | null;
  languages: string[];
  notes: string | null;
}
```

Falls back to `description.txt` if no PDF/DOCX documents are available. Returns 400 if neither source has text.

---

### POST /tenders/{source_id}/{tender_id}/team-match

Run team match fitness scoring against the current team roster. Requires that `team_requirements` has already been extracted (via `POST extract-team` or batch pipeline).

Preconditions: tender must have non-null `team_requirements`.

Response:

```ts
interface TeamMatchResult {
  team_match_score: number;           // 0.0–1.0 (4 decimal places)
  role_matches: RoleMatch[];
  gaps: GapEntry[];
  external_experts_needed: number;    // count of roles with status "gap"
  message: string | null;             // e.g. "No team members available for matching"
}

interface RoleMatch {
  required_role: string;
  mandatory: boolean;
  best_match: BestMatch | null;       // null when no roster members exist
  match_score: number;                // 0.0–1.0
  status: "matched" | "partial" | "gap";
}

interface BestMatch {
  id: string;                         // team member UUID
  name: string;
  type: "employee" | "contractor";
  match_score: number;
  duplicate_roles: string[];          // other roles this member is also best match for
}

interface GapEntry {
  role: string;
  mandatory: boolean;
  severity: "high" | "low";           // "high" for mandatory, "low" for desirable
}
```

Error responses:
- 404 — tender not found
- 400 — no `team_requirements` extracted for this tender
- 500 — matcher internal error

The result is persisted to the `team_match_result` JSONB column and returned on subsequent `GET /tenders/{source_id}/{tender_id}` calls.

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

### POST /team

Create a new team member.

Request:

```ts
interface TeamMemberCreate {
  name: string;                          // 1–200 chars
  email: string;                         // valid email, unique
  type: "employee" | "contractor";
  roles: string[];                       // optional, max 20 items, each max 100 chars
}
```

Response: `TeamMemberResponse` (201 Created). Returns 409 if email already exists.

---

### GET /team

Paginated team member list.

Query params:

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `page` | int | 1 | 1-based |
| `page_size` | int | 20 | 1–100 |
| `type` | string | — | `employee` or `contractor` |
| `search` | string | — | Searches name and email |

Response item shape:

```ts
interface TeamMemberListItem {
  id: string;             // UUID
  name: string;
  email: string | null;
  type: "employee" | "contractor";
  roles: string[];
  extraction_status: "pending" | "completed" | "failed";
}
```

---

### GET /team/{id}

Get a single team member by UUID.

Response:

```ts
interface TeamMemberResponse {
  id: string;
  name: string;
  email: string | null;
  type: "employee" | "contractor";
  slug: string;
  phone: string | null;
  roles: string[];
  specializations: string[];     // extracted from CV
  languages: string[];           // extracted from CV
  notes: string | null;
  cv_s3_key: string | null;
  knowledge_s3_key: string | null;
  extraction_status: "pending" | "completed" | "failed";
  created_at: string;            // ISO datetime
  updated_at: string;            // ISO datetime
}
```

---

### PUT /team/{id}

Partial update of a team member. Only include fields to change.

Request:

```ts
interface TeamMemberUpdate {
  name?: string;         // 1–200 chars
  email?: string;        // valid email, unique
  phone?: string;        // max 50 chars
  roles?: string[];      // max 20 items
  notes?: string;        // max 10000 chars — triggers re-extraction if CV exists
}
```

Response: `TeamMemberResponse`. Returns 409 if email conflicts.

---

### DELETE /team/{id}

Delete a team member and associated S3 files (CV, knowledge). Returns 204 No Content.

---

### POST /team/{id}/cv

Upload a CV file for extraction. Multipart form data with `file` field.

- Formats: PDF, DOCX
- Max size: 10MB
- Triggers automatic extraction of roles, specializations, and languages via LLM

Response: `TeamMemberResponse` with updated `extraction_status` (`completed` or `failed`).

---

### POST /references

Create a new project reference. Triggers LLM extraction if description is provided.

Request:

```ts
interface ReferenceCreate {
  title: string;                    // 1–500 chars, required
  client?: string;
  sector?: string;
  region?: string;
  year?: number;                    // 1990–2030
  budget_eur?: number;              // >= 0
  description?: string;             // triggers LLM extraction
  experts_involved?: string[];      // team member UUIDs, max 50
  consortium_partners?: string[];
}
```

Response: `ReferenceResponse` (201 Created). If description present, `extraction_status` will be "completed" or "failed".

---

### GET /references

Paginated reference list with filtering.

Query params:

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `page` | int | 1 | 1-based |
| `page_size` | int | 20 | 1–100 |
| `sector` | string | — | Exact match |
| `year` | int | — | Exact match |
| `search` | string | — | Searches title and client (max 200 chars) |

Response item shape:

```ts
interface ReferenceListItem {
  id: string;
  title: string;
  client: string | null;
  sector: string | null;
  year: number | null;
  budget_eur: number | null;
  extraction_status: "pending" | "processing" | "completed" | "failed";
}
```

---

### GET /references/{id}

Full reference detail with enriched experts and document presigned URLs.

Response:

```ts
interface ReferenceResponse {
  id: string;
  title: string;
  client: string | null;
  sector: string | null;
  region: string | null;
  year: number | null;
  budget_eur: number | null;
  description: string | null;
  experts_involved: string[];
  consortium_partners: string[];
  documents: string[];
  knowledge_s3_key: string | null;
  extraction_status: string;
  extracted_fields: object;          // LLM-extracted: type, themes, donor, countries, budget_range, key_deliverables
  slug: string;
  created_at: string;
  updated_at: string;
  enriched_experts: EnrichedExpert[];  // resolved from team_members
  document_urls: DocumentInfo[];       // presigned S3 URLs (1hr expiry)
}

interface EnrichedExpert {
  id: string;
  name: string;
  roles: string[];
}

interface DocumentInfo {
  filename: string;
  presigned_url: string;
}
```

---

### PUT /references/{id}

Partial update. At least one field required. Re-extracts if description changes.

Request:

```ts
interface ReferenceUpdate {
  title?: string;
  client?: string;
  sector?: string;
  region?: string;
  year?: number;
  budget_eur?: number;
  description?: string;
  experts_involved?: string[];
  consortium_partners?: string[];
}
```

Response: `ReferenceResponse`. Returns 422 if no fields provided.

---

### DELETE /references/{id}

Delete reference and all associated S3 objects (documents + knowledge file). Returns 204.

Error: 500 if S3 deletion fails (DB record preserved).

---

### POST /references/{id}/document

Upload a document (PDF/DOCX) to a reference. Triggers re-extraction.

- Multipart form data with `file` field
- Formats: PDF, DOCX
- Max size: 10MB
- Max 10 documents per reference
- Duplicate filenames return 409

Response: `ReferenceResponse` (201 Created) with updated extraction results.

---

### DELETE /references/{id}/document/{filename}

Delete a specific document from a reference. Re-extracts from remaining context.

Returns 204. Returns 502 if S3 deletion fails.

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

Get a single setting. Valid types: `selection-criteria`, `analysis`, `company-profile`, `recipients`, `interestingness`, `digest`.

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

**digest:**
```json
{
  "score_threshold_top": 6.0,
  "score_threshold_floor": 3.0,
  "max_worth_a_look": 20,
  "max_excluded_shown": 10
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
| 400 | Invalid query params (bad `sort_by`, empty `source_id`, invalid type) |
| 404 | Tender, run, source, document, or team member not found |
| 403 | Invalid or missing `x-api-key` |
| 409 | Conflict (e.g. duplicate email for team member) |
| 413 | File too large (CV upload) |
| 422 | Validation error (invalid UUID, bad request body) |
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

Analysis fields are written by the analyzer batch pipeline. They're nullable — unanalyzed tenders have `null` for scalar fields and `[]` for `analysis_tags`.

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
- `team_requirements` — LLM-extracted team roles (same shape as `POST extract-team` response, minus `extraction_source` and `documents_used`)
- `team_match_result` — deterministic team match fitness scoring result (same shape as `POST team-match` response)

## Presigned URL Expiry

Document download URLs expire after 1 hour. If a user stays on a detail page longer than that, re-fetch the document list to get fresh URLs.
