# Analyzer Pipeline

This document explains how the RFP analyzer evaluates scraped tenders for relevance, scores them via LLM, and delivers a daily email digest.

## Pipeline Overview

The pipeline runs daily via an EventBridge rule that triggers a Step Functions state machine. It executes three sequential phases:

```
Phase 1: Trigger              Phase 2: Analysis (parallel)     Phase 3: Email
┌───────────────────────┐     ┌──────────────────────────┐     ┌─────────────────────┐
│ Fetch completed       │     │ Fetch tender detail      │     │ Scan unemailed      │
│ tenders (scraper API) │     │ from scraper API         │     │ tenders (DynamoDB)   │
│         ↓             │     │         ↓                │     │         ↓            │
│ Filter already-       │     │ Normalize metadata       │     │ Filter by score      │
│ analyzed (DynamoDB)   │     │         ↓                │     │ threshold            │
│         ↓             │     │ Build LLM prompt         │     │         ↓            │
│ Apply selection       │     │ (company profile +       │     │ Build digest         │
│ criteria              │     │  tender description)     │     │ (top-ranked +        │
│         ↓             │     │         ↓                │     │  grouped by type)    │
│ Return tender list    │     │ Call LLM (with retry)    │     │         ↓            │
│ for Map state         │     │         ↓                │     │ Render HTML template │
└───────────────────────┘     │ Parse JSON response      │     │         ↓            │
                              │         ↓                │     │ Send via SES         │
                              │ Write analysis to        │     │         ↓            │
                              │ DynamoDB                 │     │ Update emailed_at    │
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
│ max_concurrency: 5    │
│ items_path: $.tenders │
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

Individual tender analysis failures are caught by the ItemCatcher and don't abort the batch. The Email Lambda always runs, even if some analyses failed.

## Phase 1: Trigger

The Trigger Lambda (`src/handlers/trigger.py`) identifies which tenders need analysis.

1. Load settings from `config/settings.yaml`.
2. Retrieve the scraper API key from SSM Parameter Store (`/rfp-scraper/api-key`).
3. Call `GET /tenders?status=completed&page_size=100` with automatic pagination to fetch all completed tenders.
4. Batch-check DynamoDB (`BatchGetItem`, 100 keys per call) to filter out tenders that already have `analyzed_at` set.
5. Apply `SelectionCriteria` to each remaining tender (see below).
6. Write filtered-out tenders to DynamoDB with `relevance_score=0` and `analysis_model="selection-filter"` so they aren't re-processed.
7. Return the passing tenders, capped at `max_tenders_per_run` (default: 50).

### Selection Criteria

Hard filters applied before sending tenders to the LLM. These prevent wasting LLM calls on clearly irrelevant tenders.

| Filter | Field | Logic |
|--------|-------|-------|
| Budget minimum | `budget` | Must be >= €20,000 (budget of 0/unspecified passes) |
| Budget maximum | `budget` | Must be <= €2,000,000 |
| Deadline proximity | `deadline` - `posted_date` | Must be >= 5 days between publish and deadline |

All filters are optional — if a field is missing or unparseable, that check is skipped. A tender passes only if all applicable checks pass.

Tenders that fail selection are written to DynamoDB immediately:
- `relevance_score: 0`
- `analysis_summary: "Filtered: {reason}"`
- `analysis_model: "selection-filter"`
- `analyzed_at` is set, preventing re-evaluation on subsequent runs.

## Phase 2: Analysis

The Analyzer Lambda (`src/handlers/analyzer.py`) processes a single tender, invoked in parallel by the Map state (concurrency 5).

1. Load settings and company profile from config.
2. Fetch full tender detail from `GET /tenders/{source_id}/{tender_id}` — this includes `description_text` (plain text extracted from HTML by the scraper).
3. Normalize metadata: map scraper field names to canonical names (`budget` → `budget_amount`/`budget_currency`, `location_names` → `country`, etc.).
4. Build the LLM prompt combining:
   - Company profile (name, description, focus areas, preferred regions, budget range)
   - Tender metadata (title, organization, budget, deadline, country, sectors)
   - Full tender description text
   - Scoring criteria (8 dimensions: sector fit, geographic fit, budget fit, tender type, team feasibility, reference feasibility, deadline feasibility, competition level)
   - Required JSON output schema
5. Call the LLM provider (Fireworks or Bedrock, configured in `settings.yaml`).
6. Parse the JSON response into an `AnalysisResult` (handles markdown code block wrapping).
7. Write analysis fields to DynamoDB via `AnalysisWriter`.
8. Return the result dict for the Map state output.

### LLM Providers

The analyzer supports two LLM backends, selected by `settings.llm.provider`:

| Provider | Endpoint | Auth | Model (current) |
|----------|----------|------|-----------------|
| Fireworks | `https://api.fireworks.ai/inference/v1/chat/completions` | Bearer token (Secrets Manager) | `llama-v3p1-70b-instruct` |
| Bedrock | `bedrock-runtime` (boto3, eu-central-1) | IAM role | `anthropic.claude-3-haiku-20240307-v1:0` |

Both adapters use the same prompt builder and response parser. The `LLMProvider` abstract interface ensures they're interchangeable.

### Retry Logic

LLM calls are wrapped in `call_with_retry` with exponential backoff:
- Max retries: 3
- Intervals: 2s, 4s, 8s
- Retryable errors: `RateLimitError`, `TimeoutError`, `ConnectionError`

On exhaustion, the last error propagates and the Map state's ItemCatcher records the failure.

### Response Parsing

The parser (`src/analysis/parser.py`):
1. Strips optional markdown code block wrapping (` ```json ... ``` `).
2. Parses JSON.
3. Validates against the `AnalysisResult` Pydantic model (enforces `relevance_score` 1-10, valid `tender_type` enum, etc.).

Raises `LLMParsingError` on invalid JSON or schema mismatch.

## Phase 3: Email

The Email Lambda (`src/handlers/email_handler.py`) assembles and sends the daily digest.

1. Load settings and recipients from config.
2. Scan DynamoDB for tenders where `analyzed_at` is set and `emailed_at` is null.
3. Filter by `score_threshold_for_email` (default: 5) — tenders below this score are excluded.
4. Build the digest:
   - Separate top-ranked tenders (score >= 7), sorted by score descending.
   - Group remaining tenders by `tender_type` in canonical order: `full_proposal`, `expression_of_interest`, `request_to_participate`.
   - Compute stats: total count, average score, new-since-last count.
5. Render the HTML email template (`templates/digest.html.j2`) with Jinja2.
6. Send via SES to all configured recipients.
7. Update `emailed_at` for every tender included in the digest.

If no tenders pass the score threshold, the Lambda returns early without sending an email.

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

All Lambdas run Python 3.12 on ARM64. Code is bundled via Docker with `requirements-lambda.txt` (runtime deps only: pydantic, pyyaml, httpx, boto3, jinja2) plus `src/`, `config/`, and `templates/` directories.

### IAM Permissions

| Lambda | Permission | Resource |
|--------|-----------|----------|
| Trigger | `ssm:GetParameter` | `/rfp-scraper/api-key` |
| Trigger | `dynamodb:BatchGetItem`, `dynamodb:UpdateItem` | `rfp-tenders` table |
| Analyzer | `ssm:GetParameter` | `/rfp-scraper/api-key` |
| Analyzer | `dynamodb:UpdateItem` | `rfp-tenders` table |
| Analyzer | `secretsmanager:GetSecretValue` | `rfp-analyzer/fireworks-api-key` |
| Analyzer | `bedrock:InvokeModel` | `arn:aws:bedrock:eu-central-1:*` |
| Email | `dynamodb:Query`, `dynamodb:Scan`, `dynamodb:UpdateItem` | `rfp-tenders` table |
| Email | `ses:SendEmail` | `*` |

### Other Resources

| Resource | Type | Notes |
|----------|------|-------|
| `rfp-analyzer-pipeline-dev` | Step Functions (Standard) | Orchestrates the three Lambdas |
| `rfp-analyzer-schedule-dev` | EventBridge Rule | `rate(1 day)` → triggers the state machine |
| CloudWatch Log Groups | 30-day retention | One per Lambda |
| `rfp-analyzer/fireworks-api-key` | Secrets Manager | Fireworks LLM API key |
| `rfp-analyzer/scraper-api-key` | Secrets Manager | Scraper API key (CDK-managed, but pipeline uses SSM) |

Region: `eu-south-2` (except Bedrock which uses `eu-central-1`).
