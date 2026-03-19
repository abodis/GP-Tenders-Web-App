# Analyzer Data Reference

Reference for downstream consumers describing what data the analyzer produces, where it lives, and how it relates to the scraper's data.

## DynamoDB: `rfp-tenders` Table (Analysis Fields)

The analyzer writes to the same `rfp-tenders` table used by the scraper. It never modifies scraper-owned fields — it only adds analysis columns to existing tender records.

Primary key: `pk` = `{source_id}#{tender_id}` (same as scraper)

### Analysis Fields

| Field | Type | Required | Set by | Notes |
|-------|------|----------|--------|-------|
| `analysis_summary` | string | on analysis | Analyzer Lambda | 2-3 sentence summary of the tender |
| `analysis_context` | string | on analysis | Analyzer Lambda | Why this tender is relevant to the company |
| `relevance_score` | int | on analysis | Analyzer Lambda / Selection filter | 1-10 from LLM; `0` for selection-filtered tenders |
| `analysis_tags` | list[string] | on analysis | Analyzer Lambda | Sector, geography, type, effort tags |
| `analyzed_at` | string | on analysis | AnalysisWriter | ISO datetime, auto-set on write |
| `analysis_model` | string | on analysis | AnalysisWriter | Model identifier, e.g. `"accounts/fireworks/models/llama-v3p3-70b-instruct"` or `"selection-filter"` |
| `tender_type` | string | on analysis | Analyzer Lambda | `request_to_participate` \| `expression_of_interest` \| `full_proposal` |
| `experts_required` | map \| null | on analysis | Analyzer Lambda | `{international, local, key_experts, total, notes}` |
| `references_required` | map \| null | on analysis | Analyzer Lambda | `{count, type, value_eur, timeline_years, notes}` |
| `turnover_required` | map \| null | on analysis | Analyzer Lambda | `{annual_eur, years, notes}` |
| `emailed_at` | string | on email | Email Lambda | ISO datetime, set after digest is sent |

### Field Ownership Boundary

The `AnalysisWriter` enforces a strict allowlist (`ANALYSIS_FIELDS`) so that analysis writes can never corrupt scraper-owned fields like `status`, `s3_prefix`, or `retry_count`. The `emailed_at` field is written separately by the `EmailSender`.

### Selection-Filtered Tenders

Tenders that fail the pre-analysis selection criteria are written to DynamoDB with:
- `relevance_score`: `0`
- `analysis_summary`: `"Filtered: {reason}"` (e.g. `"Filtered: Budget 5000 EUR below minimum 20000"`)
- `analysis_model`: `"selection-filter"`
- `analyzed_at`: set (so they are not re-processed)

These tenders are never sent to the LLM and never appear in the email digest.

## S3: `novare-rfp-scraper-data-dev`

The analyzer reads from S3 but does not write to it. Tender descriptions are fetched via:
- The scraper API detail endpoint (`description_text` field), or
- Direct S3 read at `{source_id}/{tender_id}/description.txt` (via `s3_reader.py`, currently unused by the main pipeline)

## Scraper API (Consumed)

The analyzer is a downstream consumer of the scraper API. It uses two endpoints:

### GET /tenders

Used by the Trigger Lambda to fetch completed tenders for analysis.

Query params used:
- `status=completed` — only completed tenders have descriptions available
- `page_size=100` — automatic pagination via `next_cursor`

### GET /tenders/{source_id}/{tender_id}

Used by the Analyzer Lambda to fetch full tender detail including `description_text` (plain text extracted from HTML by the scraper).

Key fields consumed from the detail response:
- `title`, `organization`, `budget`, `deadline`, `location_names`, `sectors` — used as tender metadata for the LLM prompt
- `description_text` — the main input for LLM analysis

## Secrets & Parameters

| Secret | Store | Path | Used by |
|--------|-------|------|---------|
| Scraper API key | SSM Parameter Store | `/rfp-scraper/api-key` (SecureString, eu-south-2) | Trigger Lambda, Analyzer Lambda |
| Fireworks API key | Secrets Manager | `rfp-analyzer/fireworks-api-key` | Analyzer Lambda |

## Configuration Files

All configuration is loaded from YAML files bundled with the Lambda deployment package.

### `config/settings.yaml`

Top-level application settings validated by `Settings` (Pydantic v2).

| Section | Key fields | Notes |
|---------|-----------|-------|
| `scraper_api` | `base_url`, `api_key_ssm_param` | Scraper API connection |
| `llm` | `provider` (`fireworks` \| `bedrock`), provider-specific config | LLM provider selection |
| `llm.fireworks` | `api_key_secret_arn`, `model`, `max_tokens` | Fireworks-specific |
| `llm.bedrock` | `region`, `model_id`, `max_tokens` | Bedrock-specific |
| `analysis` | `schedule`, `score_threshold_for_email`, `max_tenders_per_run` | Pipeline behavior |
| `dynamodb` | `table_name`, `region` | DynamoDB connection |
| `s3` | `bucket`, `region` | S3 connection (for direct reads) |
| `ses` | `region`, `from_address` | Email sending |

### `config/company_profile.yaml`

Company profile injected into every LLM prompt. Validated by `CompanyProfile`.

| Field | Type | Notes |
|-------|------|-------|
| `company_name` | string | |
| `description` | string | Free-text company description |
| `focus_areas` | list[string] | e.g. `["public administration reform", "digital transformation"]` |
| `preferred_regions` | list[string] | e.g. `["Western Balkans", "Eastern Europe"]` |
| `typical_budget_range` | `{min_eur, max_eur}` | EUR range |
| `typical_team_size` | string | e.g. `"3-8 experts"` |

### `config/recipients.yaml`

Email digest recipients. Validated by `RecipientsConfig`.

| Field | Type | Notes |
|-------|------|-------|
| `recipients` | list[email] | SES-verified email addresses |

## LLM Analysis Output Schema

The LLM is instructed to return a JSON object matching `AnalysisResult`:

```json
{
  "summary": "2-3 sentence summary of the tender",
  "context": "Why this tender is relevant to the company",
  "relevance_score": 7,
  "tags": ["public-admin", "western-balkans", "full-proposal"],
  "tender_type": "full_proposal",
  "experts_required": {
    "international": 3,
    "local": 2,
    "key_experts": 2,
    "total": 5,
    "notes": "Senior governance expert required"
  },
  "references_required": {
    "count": 3,
    "type": "similar projects",
    "value_eur": 500000,
    "timeline_years": 5,
    "notes": "EU-funded projects preferred"
  },
  "turnover_required": {
    "annual_eur": 1000000,
    "years": 3,
    "notes": "Average annual turnover"
  }
}
```

- `relevance_score` is constrained to 1-10 by Pydantic validation.
- `tender_type` must be one of: `request_to_participate`, `expression_of_interest`, `full_proposal`.
- `experts_required`, `references_required`, `turnover_required` are nullable — the LLM returns `null` when the tender description doesn't specify these requirements.

## Email Digest Data

The `DigestBuilder` assembles a `DigestData` payload from analyzed tenders:

| Field | Type | Notes |
|-------|------|-------|
| `total_count` | int | Tenders passing the score threshold |
| `average_score` | float | Mean relevance_score of included tenders |
| `new_since_last` | int | Count where `emailed_at` is null |
| `top_ranked` | list[TenderDigestItem] | Score >= 7, sorted descending |
| `grouped_sections` | dict[str, list[TenderDigestItem]] | Remaining tenders grouped by `tender_type` in order: `full_proposal`, `expression_of_interest`, `request_to_participate` |
| `date` | string | ISO date of digest generation |

Tenders with `relevance_score` below `score_threshold_for_email` (default: 5) are excluded from the digest entirely.
