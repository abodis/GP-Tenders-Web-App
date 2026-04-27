# Analyzer Pipeline

This document explains how the RFP analyzer evaluates scraped tenders for relevance, scores them via LLM, and delivers a daily email digest.

## Pipeline Overview

The pipeline runs daily via an EventBridge rule that triggers a Step Functions state machine. It executes three sequential phases:

```
Phase 1: Trigger              Phase 2: Analysis (parallel)     Phase 3: Email
┌───────────────────────┐     ┌──────────────────────────┐     ┌─────────────────────┐
│ Fetch completed       │     │ Fetch tender detail      │     │ Scan unemailed      │
│ tenders (scraper API) │     │ from scraper API         │     │ tenders (PostgreSQL) │
│         ↓             │     │         ↓                │     │         ↓            │
│ Filter already-       │     │ Normalize metadata       │     │ Filter by score      │
│ analyzed (API)        │     │         ↓                │     │ threshold            │
│         ↓             │     │ Build LLM prompt         │     │         ↓            │
│ Apply selection       │     │ (company profile +       │     │ Build digest         │
│ criteria              │     │  tender description)     │     │ (top-ranked +        │
│         ↓             │     │         ↓                │     │  grouped by type)    │
│ Return tender list    │     │ Call LLM (with retry)    │     │         ↓            │
│ for Map state         │     │         ↓                │     │ Render HTML template │
└───────────────────────┘     │ Parse JSON response      │     │         ↓            │
                              │         ↓                │     │ Send via SES         │
                              │ Write analysis to        │     │         ↓            │
                              │ PostgreSQL               │     │ Update emailed_at    │
                              └──────────────────────────┘     └─────────────────────┘
```

## Step Functions State Machine

```
EventBridge (rate: 1 day)
        │
        ▼
┌───────────────┐
│ TriggerLambda │
│ (60s timeout) │
└───────┬───────┘
        │ {tenders: [...]}
        ▼
┌───────────────────────┐
│ Map: AnalyzeEachTender│
│ max_concurrency: 2    │
│ items_path: $.tenders │
│ result_path: DISCARD  │
│                       │
│  ┌─────────────────┐  │
│  │ AnalyzerLambda  │  │
│  │ (120s timeout)  │  │
│  └────────┬────────┘  │
│           │            │
│  ItemCatcher on error  │
│  → Pass (FAILED)       │
└───────────┬───────────┘
            │
            ▼
    ┌──────────────┐
    │ EmailLambda  │
    │ (60s timeout)│
    └──────────────┘
```

Individual tender analysis failures are caught by the ItemCatcher and don't abort the batch. The Map state discards its output (`result_path: DISCARD`), so the Email Lambda receives the original Trigger output (tender list), not the individual analyzer results. The Email Lambda always runs, even if some analyses failed.

## Phase 1: Trigger

The Trigger Lambda (`src/handlers/trigger.py`) identifies which tenders need analysis.

1. Load infrastructure settings from `config/settings.yaml`.
2. Retrieve the scraper API key from SSM Parameter Store (`/rfp-scraper/api-key`).
3. Fetch analysis settings from the scraper API (`GET /settings/analysis`) to get `max_tenders_per_run`.
4. Fetch completed, unanalyzed tenders from the scraper API (the API handles the `analyzed_at IS NULL` filter server-side).
5. Apply `SelectionCriteria` to each tender (see below).
6. Write filtered-out tenders to PostgreSQL with `relevance_score=0` and `analysis_model="selection-filter"` so they aren't re-processed.
7. Return slim tender references (only `source_id` and `tender_id`) for passing tenders, capped at `max_tenders_per_run` (from API settings, default: 1000). Full tender data is not passed through Step Functions — the Analyzer Lambda fetches detail independently from the scraper API. This keeps the payload well within the Step Functions 256KB limit.

### Selection Criteria

Hard filters applied before sending tenders to the LLM. These prevent wasting LLM calls on clearly irrelevant tenders.

| Filter | Field | Logic |
|--------|-------|-------|
| Budget minimum | `budget`, `currency` | Must be >= €20,000 (budget of 0/unspecified passes). Currency read from tender's `currency` field, defaults to EUR if absent. Only EUR and USD budgets are checked. |
| Budget maximum | `budget`, `currency` | Must be <= €2,000,000 (same currency logic as minimum) |
| Deadline proximity | `deadline` - `posted_date` | Must be >= 5 days between publish and deadline |

All filters are optional — if a field is missing or unparseable, that check is skipped. A tender passes only if all applicable checks pass. Budget checks only apply to EUR and USD currencies — tenders with other currencies skip the budget filter entirely.

Tenders that fail selection are written to PostgreSQL immediately:
- `relevance_score: 0`
- `analysis_summary: "Filtered: {reason}"`
- `analysis_model: "selection-filter"`
- `analyzed_at` is set, preventing re-evaluation on subsequent runs.

## Phase 2: Analysis

The Analyzer Lambda (`src/handlers/analyzer.py`) processes a single tender, invoked in parallel by the Map state (concurrency 2).

1. Load infrastructure settings from `config/settings.yaml` (LLM config, PostgreSQL, scraper API connection).
2. Fetch analysis settings from the scraper API (`GET /settings/analysis`) to get `scoring_criteria`.
3. Fetch company profile from the scraper API (`GET /settings/company-profile`), stripping `setting_type` and `updated_at` metadata fields.
4. Fetch full tender detail from `GET /tenders/{source_id}/{tender_id}` — this includes `description_text` (plain text extracted from HTML by the scraper).
5. Normalize metadata: map scraper field names to canonical names (`budget` → `budget_amount`/`budget_currency`, `location_names` → `country`, etc.).
6. Build the LLM prompt combining:
   - Company profile (from API: name, description, focus areas, preferred regions, budget range)
   - Tender metadata (title, organization, budget, deadline, country, sectors)
   - Full tender description text
   - Scoring criteria (from API, e.g. sector fit, geographic fit, budget fit, tender type, expertise match, IFI/donor alignment, deadline feasibility, competition level)
   - Required JSON output schema
7. Call the LLM provider (Fireworks or Bedrock, configured in `settings.yaml`).
8. Parse the JSON response into an `AnalysisResult` (handles markdown code block wrapping).
9. Write analysis fields to PostgreSQL via `AnalysisWriter` (`src/storage/postgres.py`).
10. Return the result dict for the Map state output.

### LLM Providers

The analyzer supports two LLM backends, selected by `settings.llm.provider`:

| Provider | Endpoint | Auth | Model (current) |
|----------|----------|------|-----------------|
| Fireworks | `https://api.fireworks.ai/inference/v1/chat/completions` | Bearer token (Secrets Manager) | `llama-v3p3-70b-instruct` |
| Bedrock | `bedrock-runtime` (boto3, eu-central-1) | IAM role | `anthropic.claude-3-haiku-20240307-v1:0` |

Both adapters use the same prompt builder and response parser. The `LLMProvider` abstract interface ensures they're interchangeable.

### Retry Logic

LLM calls are wrapped in `call_with_retry` with exponential backoff:
- Max retries: 3
- Intervals: 3s, 8s, 15s
- Retryable errors: `RateLimitError`, `TimeoutError`, `ConnectionError`

The Fireworks adapter explicitly detects HTTP 429 responses and raises `RateLimitError` before `raise_for_status()`, ensuring rate-limit responses are retried rather than surfacing as generic HTTP errors.

On exhaustion, the last error propagates and the Map state's ItemCatcher records the failure.

### Response Parsing

The parser (`src/analysis/parser.py`):
1. Strips optional markdown code block wrapping (` ```json ... ``` `).
2. Applies light repairs for common LLM JSON mistakes (e.g. trailing commas, unquoted keys).
3. Parses JSON.
4. Validates against the `AnalysisResult` Pydantic model (enforces `relevance_score` 1-10, valid `tender_type` enum, etc.).

Raises `LLMParsingError` on invalid JSON or schema mismatch.

## Phase 3: Email

The Email Lambda (`src/handlers/email_handler.py`) assembles and sends the daily digest.

1. Load infrastructure settings from `config/settings.yaml` (PostgreSQL, SES connection).
2. Retrieve the scraper API key from SSM Parameter Store (`/rfp-scraper/api-key`).
3. Fetch analysis settings from the scraper API (`GET /settings/analysis`) to get `score_threshold_for_email`.
4. Fetch recipients from the scraper API (`GET /settings/recipients`) to get the email recipient list.
5. Fetch today's scraper run from the API (`GET /sources/{source_id}/runs/{today}`) for the run summary.
6. Query PostgreSQL for tenders where `analyzed_at` is set and `emailed_at` is null.
7. Filter by `score_threshold_for_email` (from API settings, default: 5) — tenders below this score are excluded.
8. Build the digest:
   - Separate top-ranked tenders (score >= 7), sorted by score descending.
   - Group remaining tenders by `tender_type` in canonical order: `full_proposal`, `expression_of_interest`, `request_to_participate`.
   - Compute stats: total count, average score, new-since-last count.
9. Render the HTML email template (`templates/digest.html.j2`) with Jinja2, passing the latest scraper run data alongside the digest data.
10. Send via SES to all configured recipients (from API settings). An email is always sent — either a full digest or a summary-only email with run stats.
11. Update `emailed_at` for every tender included in the digest.

The Lambda always sends an email — either a full digest when tenders qualify, or a run-summary-only email when none do. The latest scraper run stats are fetched directly from the scraper API, so recipients can see what happened during the most recent scraper run even when no tenders qualify for the digest.

## Tender Analysis Lifecycle

```
                    ┌──────────────────┐
                    │ completed tender │
                    │ (from scraper)   │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
              ┌─────┤ Selection filter ├─────┐
              │     └──────────────────┘     │
              │                              │
     ┌────────▼───────┐          ┌───────────▼──────────┐
     │  passes filter  │          │  filtered out         │
     │                 │          │  score=0, model=      │
     └────────┬───────┘          │  "selection-filter"   │
              │                  └──────────────────────┘
     ┌────────▼───────┐
     │  LLM analysis   │
     └───┬─────────┬──┘
         │         │
┌────────▼──┐  ┌───▼──────────┐
│ analyzed   │  │ LLM error    │──── retried (up to 3x)
│ score 1-10 │  │ (ItemCatcher)│
└────────┬──┘  └──────────────┘
         │
    ┌────▼──────────────┐
    │ score >= threshold │──── yes ──→ included in digest
    │ (default: 5)       │              → emailed_at set
    └────┬──────────────┘
         │ no
         └──→ not emailed (stays in DB)
```

## Infrastructure

### Lambda Functions

| Function | Name | Handler | Timeout | Memory |
|----------|------|---------|---------|--------|
| Trigger | `rfp-analyzer-trigger-dev` | `src.handlers.trigger.handler` | 60s | 256 MB |
| Analyzer | `rfp-analyzer-analyzer-dev` | `src.handlers.analyzer.handler` | 120s | 256 MB |
| Email | `rfp-analyzer-email-dev` | `src.handlers.email_handler.handler` | 60s | 256 MB |

All Lambdas run Python 3.12 on ARM64. Code is bundled via Docker with `requirements-lambda.txt` (runtime deps only: pydantic, pyyaml, httpx, boto3, jinja2, psycopg2-binary) plus `src/`, `config/`, and `templates/` directories.

### VPC Networking

All Lambdas run in a CDK-managed private subnet (`172.31.48.0/24`, eu-south-2b) within the default VPC. A NAT gateway in the public subnet (`subnet-096ecb716ae2ff567`) provides outbound internet access for SSM, Secrets Manager, the scraper API, and the Fireworks API. RDS is reachable via the shared Lambda security group (`sg-0b56749e6d0eafd0e`).

DB credentials (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`) are injected as Lambda environment variables from the RDS secret via CloudFormation dynamic references at deploy time.

### IAM Permissions

| Lambda | Permission | Resource |
|--------|-----------|----------|
| Trigger | `ssm:GetParameter` | `/rfp-scraper/api-key` |
| Trigger | RDS (PostgreSQL) | `tenders` table (via VPC + security group) |
| Analyzer | `ssm:GetParameter` | `/rfp-scraper/api-key` |
| Analyzer | RDS (PostgreSQL) | `tenders` table (via VPC + security group) |
| Analyzer | `secretsmanager:GetSecretValue` | `rfp-analyzer/fireworks-api-key` |
| Analyzer | `bedrock:InvokeModel` | `arn:aws:bedrock:eu-central-1:*` |
| Email | `ssm:GetParameter` | `/rfp-scraper/api-key` |
| Email | RDS (PostgreSQL) | `tenders` table (via VPC + security group) |
| Email | `ses:SendEmail` | `*` |
| Email | `secretsmanager:GetSecretValue` | `rfp-analyzer/fireworks-api-key` |
| Email | `secretsmanager:GetSecretValue` | `rfp-analyzer/scraper-api-key` |

### Alerting

An SNS topic (`rfp-analyzer-alerts-dev`) delivers alarm notifications via email. Three CloudWatch alarms are configured:

| Alarm | Metric | Condition | Notes |
|-------|--------|-----------|-------|
| `rfp-analyzer-no-execution-dev` | `ExecutionsStarted` (state machine) | < 1 in 26 hours | Missing data treated as breaching; detects pipeline not running |
| `rfp-analyzer-execution-failed-dev` | `ExecutionsFailed` (state machine) | ≥ 1 in 5 min | Fires on failed, timed-out, or aborted executions |
| `rfp-analyzer-analyzer-errors-dev` | `Errors` (Analyzer Lambda) | ≥ 1 in 5 min | Individual tender analysis failures (caught by ItemCatcher) |

### Other Resources

| Resource | Type | Notes |
|----------|------|-------|
| `rfp-analyzer-pipeline-dev` | Step Functions (Standard) | Orchestrates the three Lambdas |
| `rfp-analyzer-schedule-dev` | EventBridge Rule | `cron(0 5 * * ? *)` (daily at 05:00 UTC) → triggers the state machine |
| `rfp-analyzer-nat-dev` | NAT Gateway | eu-south-2b, uses EIP `eipalloc-021c85231980ac9ae` |
| Private subnet `172.31.48.0/24` | VPC Subnet | CDK-managed, eu-south-2b, routes 0.0.0.0/0 → NAT |
| `rfp-analyzer-alerts-dev` | SNS Topic | Email subscription for alarm notifications |
| CloudWatch Log Groups | 30-day retention | One per Lambda |
| `rfp-analyzer/fireworks-api-key` | Secrets Manager | Fireworks LLM API key |
| `rfp-analyzer/scraper-api-key` | Secrets Manager | Scraper API key (CDK-managed, but pipeline uses SSM) |

Region: `eu-south-2` (except Bedrock which uses `eu-central-1` and SES which uses `eu-west-3`).
