# Frontend v2 Requirements

Date: 2026-07-19
Audience: Web app implementation team
Companion files: `docs/openapi.yaml` (full API schema)

---

## Overview

The backend API (`docs/openapi.yaml`) now supports the full v2 feature set. This document describes what capabilities the web app needs to expose to users, organized by domain. UX/layout decisions are left to the implementation team — this covers *what* data is available and *what* actions are possible.

Base URL: `https://sj7ac51cyi.execute-api.eu-south-2.amazonaws.com`
Auth: `x-api-key` header on all requests (except `/health`).

---

## 1. Tender Browsing & Search

### Data Available

The `GET /tenders` endpoint supports filtering, sorting, full-text search, and pagination.

**List item fields:**

| Field | Type | Notes |
|-------|------|-------|
| `source_id` | string | Source identifier |
| `tender_id` | string | Unique within source |
| `title` | string | Tender title |
| `posted_date` | string | Publication date |
| `deadline` | string? | Submission deadline |
| `status` | string | `pending`, `completed`, `skipped`, `failed` |
| `fully_visible` | bool | Whether full description was accessible |
| `budget` | int | Budget in local currency (0 = unspecified) |
| `currency` | string? | Currency code |
| `organization` | string? | Procuring entity |
| `location_names` | string? | Geographic location |
| `sectors` | string? | Sector tags |
| `types` | string? | Tender type labels |
| `relevance_score` | int? | Evaluation score (1-10) |
| `interestingness_score` | int? | Interestingness score (1-10) |
| `unified_score` | float? | Final composite score |
| `analysis_summary` | string? | One-line LLM summary |
| `analysis_tags` | string[] | Classification tags |
| `tender_type` | string? | `full_proposal`, `eoi`, `request_for_proposal` |

**Filters (query params):**

- `source_id` — single source
- `status` — tender status
- `fully_visible` — boolean
- `analyzed` — boolean (has been through scoring pipeline)
- `min_score` — minimum `relevance_score`
- `min_interestingness` — minimum `interestingness_score` (1-10)
- `tender_type` — exact match
- `discovered_from` / `discovered_to` — date range
- `q` — full-text search (matches title, description, organization, sectors)

**Sorting:**

- `relevance_score`, `budget`, `deadline`, `interestingness_score`, `unified_score`
- Direction: `asc` or `desc`
- When `q` is used, results are ranked by search relevance (sort params ignored)

**Pagination:** `page` (1-based), `page_size` (1-100, default 20). Response includes `total_count` and `total_pages`.

### Capabilities to Expose

- Filterable, sortable, searchable tender list
- Full-text search bar
- Score columns (interestingness, evaluation, unified) with visual indicators
- Date range picker for discovery window
- Click-through to tender detail

---

## 2. Tender Detail

### Data Available

`GET /tenders/{source_id}/{tender_id}` returns the full tender record. In addition to list fields:

| Field | Type | Notes |
|-------|------|-------|
| `description_text` | string? | Full tender description (from S3) |
| `detail` | object? | Raw detail JSON from source API |
| `team_requirements` | object? | Extracted team requirements (see §3) |
| `team_match_result` | object? | Team match scoring results (see §4) |
| `reference_requirements` | object? | Extracted reference requirements (see §6) |
| `reference_match_result` | object? | Reference match results (see §6) |
| `exclusion_result` | object? | Exclusion criteria evaluation (see §7) |
| `interestingness_reasoning` | string? | LLM reasoning for interestingness score |
| `analysis_context` | string? | Full analysis reasoning from evaluation |
| `experts_required` | object? | Legacy experts field |
| `references_required` | object? | Legacy references field |
| `turnover_required` | object? | Legacy turnover field |
| `documents_total` | int | Number of associated documents |
| `documents_downloaded` | int | Successfully retrieved documents |
| `warnings` | string[] | Data quality warnings |

### Actions Available from Tender Detail

| Action | Endpoint | Notes |
|--------|----------|-------|
| Extract team requirements | `POST .../extract-team` | Triggers LLM extraction, updates `team_requirements` |
| Run team match | `POST .../team-match` | Requires team requirements to exist |
| Extract reference requirements | `POST .../extract-references` | Triggers LLM extraction |
| Run reference match | `POST .../reference-match` | Requires reference requirements to exist |
| Check exclusion criteria | `POST .../check-exclusion` | Evaluates against company profile |
| Submit feedback | `POST .../feedback` | Thumbs up/down for interestingness calibration |
| Remove feedback | `DELETE .../feedback` | Undo previous feedback |
| List documents | `GET .../documents` | Returns presigned download URLs |
| Get single document | `GET .../documents/{filename}` | Presigned URL for one file |
| View audit trail | `GET .../audit` | Filterable by `step` and `run_id` |

All POST action endpoints are idempotent — re-running overwrites previous results.

---

## 3. Team Requirements (per tender)

Stored in `tender.team_requirements` JSONB. Structure:

```json
{
  "team_requirements": [
    {
      "role": "Senior Hydrologist",
      "specializations": ["water_resource_management", "hydrological_modeling"],
      "mandatory": true,
      "min_years": 10,
      "languages": ["en"],
      "notes": "Must have experience in Balkan region"
    }
  ],
  "total_experts_required": 5
}
```

### Display Needs

- Table of required roles: role name, mandatory/desirable badge, specializations as tags, min years, languages, notes
- Total experts count
- "Extract" button to trigger `POST .../extract-team` (only for `completed` tenders)

---

## 4. Team Match Fitness (per tender)

Stored in `tender.team_match_result` JSONB. Structure:

```json
{
  "team_match_score": 0.72,
  "role_matches": [
    {
      "required_role": "Senior Hydrologist",
      "mandatory": true,
      "best_match": {
        "id": "uuid",
        "name": "Ciprian Popovici",
        "type": "employee",
        "match_score": 0.65,
        "duplicate_roles": []
      },
      "match_score": 0.65,
      "status": "matched"
    },
    {
      "required_role": "GIS Specialist",
      "mandatory": false,
      "best_match": null,
      "match_score": 0.0,
      "status": "gap"
    }
  ],
  "gaps": [
    { "role": "GIS Specialist", "mandatory": false, "severity": "low" }
  ],
  "external_experts_needed": 1,
  "message": null
}
```

### Display Needs

- Overall score (0-1) as progress bar or percentage
- Per-role table: required role, mandatory badge, matched team member name (linked to team detail), match quality indicator, status color coding (matched=green, partial=yellow, gap=red)
- Gaps section with severity indicators
- External experts needed count
- "Run Match" button (requires team requirements to exist first)

### Important Notes

- `status: "matched"` with `match_score < 0.5` indicates a weak fit — these should be visually flagged even though technically assigned
- Gaps don't eliminate a tender — they lower the score. Display as warnings, not blockers.

---

## 5. Team Management

### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/team` | List (paginated, filterable by `type`, searchable) |
| `POST` | `/team` | Create member |
| `GET` | `/team/{id}` | Get detail |
| `PUT` | `/team/{id}` | Update member |
| `DELETE` | `/team/{id}` | Remove member + cleanup S3 |
| `POST` | `/team/{id}/cv` | Upload CV (multipart/form-data, PDF/DOCX, max 10MB) |

### Create Request

```json
{
  "name": "Reka Soos",
  "email": "reka@greenpartners.ro",
  "type": "employee",
  "roles": ["project_director", "environmental_economist"]
}
```

- `type`: enum `"employee"` | `"contractor"`
- `email`: must be unique
- `roles`: optional, max 20 items, each max 100 chars

### Update Request (partial — all fields optional)

```json
{
  "name": "...",
  "email": "...",
  "phone": "...",
  "roles": ["..."],
  "notes": "Free-text notes about the person (max 10,000 chars)"
}
```

### Full Member Response

```json
{
  "id": "uuid",
  "name": "Reka Soos",
  "email": "reka@greenpartners.ro",
  "type": "employee",
  "slug": "reka-soos",
  "phone": null,
  "roles": ["project_director", "environmental_economist"],
  "specializations": ["climate_change", "waste_management", "eia"],
  "languages": ["en", "ro", "hu"],
  "notes": "M.Sc. in Environmental Economics...",
  "cv_s3_key": "knowledge/team/cvs/reka-soos.pdf",
  "knowledge_s3_key": "knowledge/team/reka-soos.md",
  "extraction_status": "completed",
  "created_at": "2026-07-11T12:00:00",
  "updated_at": "2026-07-11T12:00:00"
}
```

### List Item Response (subset)

```json
{
  "id": "uuid",
  "name": "Reka Soos",
  "email": "reka@greenpartners.ro",
  "type": "employee",
  "roles": ["project_director"],
  "extraction_status": "completed"
}
```

### CV Upload Behavior

- `POST /team/{id}/cv` with `Content-Type: multipart/form-data`
- Accepted formats: `.pdf`, `.docx`
- Max size: 10MB
- On upload: file stored in S3, LLM extraction runs synchronously, response returns updated member with extracted `specializations`, `languages`, `roles`
- `extraction_status`: `"pending"` → `"completed"` (success) or `"failed"` (LLM error)

### Notes Update Side Effect

When `notes` is updated AND a CV exists, the system re-extracts using CV + updated notes. The response reflects the updated extraction.

### Display Needs

- Team member list: name, type badge, roles as tags, extraction status indicator
- Filters: type (employee/contractor), search by name
- Member detail: all extracted fields displayed (specializations, languages as tags), CV download, notes editor
- CV upload zone with drag-and-drop
- Extraction status indicator (pending/completed/failed)
- Delete confirmation (irreversible — removes S3 files)

---

## 6. Reference / Past Projects Management

### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/references` | List (paginated, filterable by sector/year, searchable) |
| `POST` | `/references` | Create reference |
| `GET` | `/references/{id}` | Detail with enriched experts + presigned doc URLs |
| `PUT` | `/references/{id}` | Update (re-extracts on description change) |
| `DELETE` | `/references/{id}` | Remove + S3 cleanup |
| `POST` | `/references/{id}/document` | Upload document (PDF/DOCX) |
| `DELETE` | `/references/{id}/document/{filename}` | Remove document |
| `POST` | `/references/{id}/extract` | Manually trigger re-extraction |

### Create Request

```json
{
  "title": "Wastewater Infrastructure Feasibility — Cluj County",
  "client": "World Bank / Romanian Ministry of Environment",
  "sector": "wastewater",
  "region": "Romania",
  "year": 2023,
  "budget_eur": 450000,
  "description": "Feasibility study and EIA for wastewater treatment plant...",
  "experts_involved": ["team-member-uuid-1", "team-member-uuid-2"],
  "consortium_partners": ["Romanian Water Authority"]
}
```

- `year`: 1990-2030
- `budget_eur`: >= 0 (EUR)
- `experts_involved`: array of team member UUIDs (max 50)
- If `description` is non-empty, LLM extraction runs automatically on create

### Full Response

```json
{
  "id": "uuid",
  "title": "Wastewater Infrastructure Feasibility — Cluj County",
  "client": "World Bank / Romanian Ministry of Environment",
  "sector": "wastewater",
  "region": "Romania",
  "year": 2023,
  "budget_eur": 450000,
  "description": "...",
  "experts_involved": ["uuid-1", "uuid-2"],
  "consortium_partners": ["Romanian Water Authority"],
  "documents": ["final-report.pdf", "annexes.pdf"],
  "knowledge_s3_key": "knowledge/references/wastewater-infrastructure-feasibility-cluj-county.md",
  "extraction_status": "completed",
  "extracted_fields": {
    "type": "feasibility_study",
    "themes": ["wastewater", "eia", "municipal_infrastructure"],
    "donor": "world_bank",
    "countries": ["Romania"],
    "budget_range": { "min": 400000, "max": 500000 },
    "key_deliverables": ["feasibility study", "EIA report"]
  },
  "slug": "wastewater-infrastructure-feasibility-cluj-county",
  "created_at": "2026-07-11T12:00:00",
  "updated_at": "2026-07-11T12:00:00",
  "enriched_experts": [
    { "id": "uuid-1", "name": "Reka Soos", "roles": ["project_director"] }
  ],
  "document_urls": [
    { "filename": "final-report.pdf", "presigned_url": "https://..." }
  ]
}
```

### Reference Matching (per tender)

Stored in `tender.reference_requirements` and `tender.reference_match_result`:

**Requirements structure:**

```json
{
  "reference_requirements": [
    {
      "domain": "wastewater infrastructure",
      "min_projects": 2,
      "min_value_eur": 200000,
      "max_age_years": 10,
      "region": "Eastern Europe",
      "donor": "World Bank",
      "mandatory": true
    }
  ]
}
```

**Match result structure:**

```json
{
  "reference_match_score": 0.85,
  "requirement_matches": [
    {
      "domain": "wastewater infrastructure",
      "mandatory": true,
      "best_matches": [
        {
          "id": "ref-uuid",
          "title": "Cluj Wastewater Study",
          "match_score": 0.9,
          "match_factors": {
            "domain": 0.8,
            "budget": 1.0,
            "recency": 1.0,
            "region": 0.5,
            "donor": 1.0
          },
          "consortium_coverage": false
        }
      ],
      "status": "matched",
      "coverage_count": 2,
      "gap_note": null
    }
  ],
  "gaps": [],
  "consortium_note": null
}
```

### Display Needs

- Reference list: title, client, sector, year, budget, extraction status
- Filters: sector, year, search
- Detail view: all fields, linked experts (clickable to team member), document downloads, extracted themes as tags
- Document upload/delete
- Re-extract button
- On tender detail: reference requirements table + match results with per-requirement breakdown

---

## 7. Exclusion Criteria (per tender)

Stored in `tender.exclusion_result` JSONB. Structure:

```json
{
  "criteria": [
    {
      "criterion": "Minimum annual turnover EUR 5M",
      "category": "financial",
      "assessment": "fail",
      "confidence": "high",
      "reason": "GP is an SME with annual turnover likely below EUR 5M"
    },
    {
      "criterion": "Must be registered in an EU member state",
      "category": "legal",
      "assessment": "pass",
      "confidence": "high",
      "reason": "GP is registered in Romania, an EU member state"
    },
    {
      "criterion": "Minimum 3 years experience in marine biology",
      "category": "experience",
      "assessment": "uncertain",
      "confidence": "medium",
      "reason": "GP has environmental consulting experience but marine biology specifically is unclear"
    }
  ],
  "excluded": true,
  "exclusion_reasons": ["Minimum annual turnover EUR 5M"],
  "uncertain_flags": ["Minimum 3 years experience in marine biology"],
  "extraction_confidence": "medium"
}
```

### Categories

`financial`, `legal`, `experience`, `accreditation`, `geographic`, `consortium`, `capacity`

### Assessment values

- `pass` — GP meets the criterion
- `fail` — GP does NOT meet the criterion (hard kill if confidence=high)
- `uncertain` — cannot determine (flagged for human review)

### Display Needs

- **Excluded tenders:** prominent red banner/indicator. Should be hidden from default list view but accessible via toggle/filter.
- Criteria table: criterion text, category badge, assessment (pass/fail/uncertain with color coding), confidence level, reason
- `exclusion_reasons` as a summary list at the top of the section
- `uncertain_flags` as amber warnings (these need human review)
- "Check Exclusion" button on tender detail

---

## 8. Interestingness & Feedback

### Interestingness Score

Displayed on tender list and detail:

- `interestingness_score`: 1-10 integer
- `interestingness_reasoning`: LLM's explanation (max 500 chars)
- `unified_score`: final composite (float, 4dp)

The interestingness scorer is the upstream gate — only top-N tenders (configurable) proceed to full analysis.

### Feedback Loop

Users provide thumbs-up/thumbs-down on tenders. This calibrates the LLM's interestingness scoring over time.

| Action | Endpoint | Body |
|--------|----------|------|
| Submit feedback | `POST /tenders/{source_id}/{tender_id}/feedback` | `{"feedback_type": "interesting"}` or `{"feedback_type": "boring"}` |
| Remove feedback | `DELETE /tenders/{source_id}/{tender_id}/feedback` | — |

- Upsert behavior: one feedback per tender, last wins
- Response: `{ "pk", "source_id", "tender_id", "feedback_type", "created_at" }`

### Display Needs

- Thumbs-up / thumbs-down buttons on tender cards/detail (mutually exclusive toggle)
- Visual indicator of current feedback state (if any)
- No separate "feedback history" view needed — it's per-tender inline

---

## 9. Unified Score Breakdown

The `unified_score` on each tender is computed as:

```
unified_score = interestingness × eval_factor × team_factor × ref_factor × exclusion_factor

eval_factor       = 0.6 + (relevance_score / 10) × 0.4      → range 0.64–1.0
team_factor       = 0.7 + team_match_score × 0.3             → range 0.7–1.0
ref_factor        = 0.7 + reference_match_score × 0.3        → range 0.7–1.0
exclusion_factor  = 0.0 if excluded, 1.0 otherwise
```

Missing sub-scores use neutral factor 1.0 (no penalty for data that hasn't been computed yet).

### Display Needs

- Score breakdown visualization on tender detail (e.g., stacked bar, factor list)
- Show which components have been computed vs which are pending
- Excluded tenders always show 0 regardless of other scores

---

## 10. Audit Trail

### Endpoint

`GET /tenders/{source_id}/{tender_id}/audit`

**Query params:**
- `step` — filter to one step type
- `run_id` — filter to one pipeline run

**Valid step values:** `analysis`, `team_extraction`, `team_match`, `reference_extraction`, `reference_match`, `exclusion`, `interestingness`, `unified_score`

### Record Structure

```json
{
  "id": "uuid",
  "step": "team_match",
  "run_id": "developmentaid-org#2026-07-19",
  "created_at": "2026-07-19T10:15:32",
  "input_snapshot": { "...trimmed structured input..." },
  "output": { "...scoring result..." },
  "model": "gpt-4.1-mini",
  "model_version": "2025-04-14",
  "duration_ms": 2340
}
```

### Display Needs

- Timeline or expandable accordion per audit entry
- Filter by step type and/or run
- Collapsible JSON views for `input_snapshot` and `output`
- Show which model was used, how long it took

---

## 11. Settings

### Endpoint

`GET /settings` — list all (returns array of objects, each with `setting_type` + fields)
`GET /settings/{type}` — get one
`PUT /settings/{type}` — full replacement

### Setting Types

#### `interestingness`

```json
{
  "interest_profile": "GreenPartners is interested in environmental consulting tenders...",
  "interestingness_top_n": 100,
  "interestingness_min_score": 4
}
```

- `interest_profile`: free-text (max 5000 chars) — the team's description of what excites them
- `interestingness_top_n`: how many tenders pass the gate (1-1000)
- `interestingness_min_score`: hard floor below which tenders are skipped (1-10)

#### `analysis`

```json
{
  "score_threshold_for_email": 5,
  "max_tenders_per_run": 100,
  "scoring_criteria": ["budget fit", "donor alignment", "tender type", "deadline feasibility", "competition level"]
}
```

- `scoring_criteria`: operational criteria labels (cannot include "sector fit", "geographic fit", "expertise match" — those are handled by interestingness)

#### `company-profile`

```json
{
  "company_name": "GreenPartners",
  "description": "Environmental consulting firm...",
  "focus_areas": ["climate_change", "waste_management", "eia"],
  "preferred_regions": ["Romania", "Balkans", "Eastern Europe"],
  "typical_budget_range": { "min_eur": 50000, "max_eur": 2000000 },
  "typical_team_size": "5-15 experts per project"
}
```

#### `selection-criteria`

```json
{
  "min_budget_eur": 0,
  "max_budget_eur": 50000000,
  "min_days_publish_to_deadline": 7,
  "locations_include": ["all"],
  "status_include": ["Open"]
}
```

#### `recipients`

```json
{
  "recipients": ["ciprian@greenpartners.ro", "peter@greenpartners.ro"]
}
```

- Validated as email addresses

#### `digest`

```json
{
  "score_threshold_top": 6.0,
  "score_threshold_floor": 3.0,
  "max_worth_a_look": 20,
  "max_excluded_shown": 10
}
```

- Controls email digest section thresholds
- `score_threshold_top` must be > `score_threshold_floor`

### Display Needs

- Settings page with sections per setting type
- `interest_profile`: textarea (large, perhaps with markdown preview)
- Numeric fields: sliders or number inputs with min/max constraints
- `scoring_criteria`: editable list (add/remove items) with forbidden values validation
- `recipients`: email list editor (add/remove with format validation)
- `focus_areas`, `preferred_regions`: tag editors
- `typical_budget_range`: two number inputs (min/max, EUR)
- Save button per section with validation feedback

---

## 12. Pipeline Monitoring (Runs)

### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/sources/{source_id}/runs` | Paginated run list, newest first |
| `GET` | `/sources/{source_id}/runs/{run_date}` | Single run with stats |
| `GET` | `/sources/{source_id}/runs/{run_date}/tenders` | Tenders linked to a run |

### Run Detail

```json
{
  "pk": "developmentaid-org#2026-07-19",
  "source_id": "developmentaid-org",
  "run_date": "2026-07-19",
  "started_at": "2026-07-19T10:00:00",
  "completed_at": "2026-07-19T10:05:23",
  "status": "completed",
  "collector_result": {
    "total_found": 245,
    "new_tenders": 12,
    "new_pending": 8,
    "new_skipped": 2,
    "duplicates": 233,
    "errors": 0
  },
  "retriever_result": {
    "processed": 8,
    "successful": 7,
    "failed": 1,
    "permanently_failed": 0,
    "documents_downloaded": 15,
    "documents_failed": 2
  }
}
```

### Run-linked Tenders

`GET /sources/{source_id}/runs/{run_date}/tenders?phase=discovered` (or `phase=processed`)

### Display Needs

- Run history list per source with date, status, key stats
- Run detail: collector stats (new vs duplicates), retriever stats (success/fail)
- Drill-through to tenders discovered/processed in that run

---

## 13. Sources (read-only)

`GET /sources/` and `GET /sources/{source_id}` — informational, no mutations.

Provides source configuration details (sanitized — no secrets). Includes: enabled status, base URL, search configurations, throttle settings, daily limits.

Low priority for UI — mostly useful for debugging.

---

## 14. Documents (per tender)

`GET /tenders/{source_id}/{tender_id}/documents` — lists all documents with presigned S3 download URLs (1-hour expiry).

`GET /tenders/{source_id}/{tender_id}/documents/{filename}` — single document presigned URL.

### Display Needs

- Document list on tender detail with download links
- File size shown where available
- Links expire after 1 hour — refresh on view

---

## Summary: New Sections for v2

The existing web app presumably has basic tender listing. The v2 additions are:

1. **Team Management** (§5) — full CRUD + CV upload
2. **References Management** (§6) — full CRUD + document upload
3. **Tender Detail Overhaul** (§2-4, 6-7, 9-10) — team requirements, team match, reference match, exclusion criteria, unified score breakdown, audit trail
4. **Feedback** (§8) — thumbs up/down on tenders
5. **Settings Page** (§11) — six setting types including interest profile
6. **Search** (§1) — full-text search via `q` parameter
7. **Scoring Columns** (§1) — interestingness, evaluation, unified score in tender list

---

## Error Handling

All error responses follow the same envelope:

```json
{
  "detail": "Human-readable error message",
  "status_code": 400
}
```

Common codes:
- `400` — validation error, invalid parameters
- `404` — resource not found
- `409` — conflict (e.g., duplicate email)
- `413` — file too large
- `422` — request body validation failed
- `500` — internal server error
- `502` — upstream failure (S3 deletion failed)

Validation errors from FastAPI include field-level details in the `detail` array.

---

## CORS

The API allows all origins (`*`) with methods `GET, PUT, POST, DELETE, OPTIONS` and headers `x-api-key, Content-Type`. No CORS configuration needed on the frontend beyond including the API key header.
