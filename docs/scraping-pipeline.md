# Scraping Pipeline

This document explains how the RFP scraper discovers tenders, decides which ones are worth retrieving in full, and stores the results.

## Pipeline Overview

The pipeline runs per source (e.g. `developmentaid-org`) and executes two sequential phases:

```
Phase 1: Collection          Phase 2: Retrieval
┌─────────────────────┐      ┌──────────────────────────┐
│ Search API (paged)  │      │ Authenticate             │
│        ↓            │      │        ↓                 │
│ Parse summaries     │      │ Query PostgreSQL (pending)  │
│        ↓            │      │        ↓                 │
│ Dedup (PostgreSQL)    │      │ Fetch detail API          │
│        ↓            │      │        ↓                 │
│ Eligibility check   │      │ Download documents        │
│        ↓            │      │        ↓                 │
│ Insert: pending     │      │ Store in S3               │
│    or: skipped      │      │        ↓                 │
└─────────────────────┘      │ Mark completed/failed     │
                             └──────────────────────────┘
```

A run record is created in the `scrape_runs` PostgreSQL table at the start and updated with aggregate stats on completion. If a run for the same source and date already exists (e.g. a second manual run on the same day), the existing row is overwritten — reset to `running` with results cleared.

## Phase 1: Collection

The `TenderCollector` iterates over all configured searches for a source (e.g. "consolidated" for DevelopmentAid).

Before iterating, the collector resolves a `postedFrom` date window by looking up the last successful run date from the `scrape_runs` table. If a prior successful run exists, the search payload's `filter.postedFrom` is overridden to that run's date, narrowing results to only recently posted tenders (with one day of overlap to catch late arrivals). On the very first run (no prior history), the YAML-configured `postedFrom` is left untouched so the full initial backfill happens.

For each search:

1. POST to the search API endpoint with the search payload (with the narrowed date window, if applicable), paginating through results.
2. Parse each page into `TenderSummary` objects via the source parser.
3. For each tender:
   - **Dedup**: check if the tender already exists in PostgreSQL. If yes, count as duplicate and skip.
   - **Eligibility**: evaluate whether the tender should be retrieved (see below).
   - **Insert**: write the tender to PostgreSQL with status `pending` or `skipped`.

### The `fully_visible` flag

The DevelopmentAid API marks some tenders as `fullyVisible: true` and others as `fullyVisible: false`. Fully visible tenders have their detail page accessible without authentication. Locked tenders require a paid membership session.

- **Fully visible tenders** always get status `pending` — no eligibility check needed, since we can retrieve them for free.
- **Locked tenders** go through the eligibility filter. This avoids wasting authenticated detail-fetch quota on tenders that don't match our criteria.

## Eligibility

Eligibility is a client-side filter applied during collection to decide whether a locked tender is worth spending a detail retrieval on. It does not affect fully visible tenders.

### Configuration

Eligibility filters are defined at two levels in the source YAML:

- `eligibility_defaults` — source-level defaults, applied to all searches.
- `searches[].eligibility` — per-search override. If present, it fully replaces the source defaults (no merging).

If both are `null`, no eligibility filtering is applied and all tenders get status `pending`.

### Filter criteria

All sub-filters are optional. When present, they are evaluated in order and short-circuit on the first failure:

| Filter | Field checked | Logic |
|--------|--------------|-------|
| **status** | `status_name` | Must be in the `include` list (case-insensitive). Default: `["open"]`. |
| **locations** | `location_names` | Must contain at least one term from `include` as a case-insensitive substring. The shorthand `"europe"` expands to all European country names plus region terms (EU, Balkans, Scandinavia, etc.). |
| **budget** | `budget` | Must fall within `[min_eur, max_eur]`. Budget of 0 (unspecified) always passes. |
| **deadline** | `deadline` | Must be at least `min_days_from_now` days in the future. Past deadlines are rejected. Null/empty deadlines pass. |

### Current defaults (DevelopmentAid)

```yaml
eligibility_defaults:
  locations:
    include: ["europe", "Global", "Worldwide"]
  budget:
    min_eur: 0
    max_eur: 20000000
  deadline:
    min_days_from_now: 7
  status:
    include: ["open"]
```

This means: only retrieve locked tenders that are open, located in Europe (or global), have a budget under €20M, and have a deadline at least 7 days away.

### Outcome

- `(True, None)` → tender is inserted with status `pending` (will be retrieved in Phase 2).
- `(False, reason)` → tender is inserted with status `skipped` and the reason is stored (e.g. `"location: 'Bangladesh' not in allowed regions"`).

## Phase 2: Retrieval

The `TenderRetriever` picks up tenders that need detail fetching:

1. **Authenticate** with the source using credentials from AWS Secrets Manager.
2. **Query PostgreSQL** for tenders with status `pending`, `failed` (with retry_count < 5), or `blocked`, up to the `daily_detail_limit` (currently 100).
3. For each tender:
   - Fetch the detail API endpoint.
   - Store the raw JSON response in S3 at `{source_id}/{tender_id}/detail.json`.
   - Extract plain text from the HTML description and store as `description.txt`.
   - Download all attached documents and store under `documents/`.
   - Update PostgreSQL: set status to `completed`, document counts, and detail-sourced fields (`budget`, `currency`).
4. On failure, increment `retry_count` and set status to `failed`. After 5 failures, status becomes `permanently_failed`.

### Credit exhaustion

If the detail API returns HTTP 429 with `code: 40` in the response body, the `RetryHandler` raises `CreditExhaustedError` immediately (no retries). The retriever catches this, marks the current tender as `blocked` (without incrementing `retry_count`), and breaks the processing loop — remaining pending tenders are left for the next run. The run status is set to `credit_exhausted`.

Blocked tenders are re-queued automatically: `get_pending_tenders()` includes `blocked` alongside `pending` and `failed`, so they'll be picked up on the next run when credits have refreshed.

### Why the daily limit matters

The detail API requires authentication and each request consumes quota against the paid membership. The `daily_detail_limit` caps how many detail fetches happen per run, spreading retrieval across multiple days if there's a large backlog. Eligibility filtering in Phase 1 keeps this queue lean by preventing irrelevant locked tenders from ever entering it.

## Tender Status Lifecycle

```
                    ┌──────────────────┐
                    │   (new tender)   │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
              ┌─────┤  Phase 1 eval    ├─────┐
              │     └──────────────────┘     │
              │                              │
     ┌────────▼───────┐           ┌──────────▼──────┐
     │    pending      │           │    skipped       │
     └────────┬───────┘           └─────────────────┘
              │
     ┌────────▼───────┐
     │  Phase 2 fetch  │
     └───┬────┬────┬──┘
         │    │    │
┌────────▼┐ ┌─▼────────┐ ┌──▼───────────┐
│completed│ │  failed   │ │   blocked    │
└─────────┘ └──┬───────┘ │(credit limit)│
               │          └──────────────┘
               │ after 5 failures
      ┌────────▼──────────────┐
      │ permanently_failed     │
      └───────────────────────┘
```

## Storage Layout (S3)

```
novare-rfp-scraper-data-dev/
└── developmentaid-org/
    └── {tender_id}/
        ├── detail.json          # Raw API response
        ├── description.txt      # Plain text extracted from HTML
        └── documents/
            ├── terms-of-reference.pdf
            └── ...
```
