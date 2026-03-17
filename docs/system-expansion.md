# System Expansion Brainstorm

## What We're Building

Three new capabilities on top of the existing scraper + API:
1. **Analysis pipeline** — AI-powered summarization, contextualization, and ranking of collected tenders
2. **Email digest** — Periodic email assembling analyzed tenders, ranked, sent to a distribution list
3. **Web interface** — Browse scraping results, review analysis, search/sort/filter tenders

## What Already Exists

- `rfp-scraper` repo: scraper pipeline (ECS Fargate Spot, nightly), REST API (Lambda + API Gateway), DynamoDB (`rfp-tenders`, `scrape-runs`), S3 (`novare-rfp-scraper-data-dev`)
- API endpoints: runs, tenders (with filters, pagination), documents (presigned URLs), sources
- Tender lifecycle: `pending → completed/failed/permanently_failed`, plus `skipped` for eligibility-filtered
- S3 layout: `{source_id}/{tender_id}/detail.json`, `description.txt`, `documents/`
- ~€8-12/month total cost

## Key Decisions

### DECISION 1: Repo Structure

**Options:**

a) **Three separate repos** (scraper, analyzer, web-app) — 85% probability
   - Pros: Independent deploy cycles, clean separation of concerns, different tech stacks (Python backend vs JS/TS frontend), each repo stays focused and small, teams could work independently
   - Cons: Cross-repo coordination for shared types/contracts, need to version the API

b) **Two repos** (scraper+analyzer backend monorepo, web-app frontend) — 10% probability
   - Pros: Analyzer shares Pydantic models and DynamoDB access patterns with scraper, single Python codebase
   - Cons: Couples deploy cycles, analyzer has very different runtime needs (LLM calls, long processing) vs scraper (HTTP scraping), muddies the clean API boundary

c) **Monorepo** (everything in one repo) — 5% probability
   - Pros: Easiest cross-cutting changes, single CI/CD
   - Cons: Python + JS/TS in one repo is messy, very different deployment targets (Fargate, Lambda, static hosting), blast radius on changes

**Recommendation: (a) Three repos.** The scraper API already exists as a clean contract boundary. The analyzer is a different workload (LLM calls, batch processing) with different scaling needs. The web app is a completely different tech stack. The API-patterns steering already documents this as the intended architecture.

Repos:
- `rfp-scraper` (this repo) — scraper + data API, unchanged
- `rfp-analyzer` — analysis pipeline + email digest service
- `rfp-web` — web interface

### DECISION 2: Analyzer + Emailer — Together or Separate?

**Options:**

a) **Single `rfp-analyzer` repo with both analysis and email** — 80% probability
   - Pros: Both are downstream consumers of the scraper API, both run on schedules, both need the same tender data, emailer depends on analysis output (ranking), shared config (which tenders, which recipients), natural pipeline: analyze → rank → email
   - Cons: Two concerns in one repo (but they're tightly coupled)

b) **Separate `rfp-analyzer` and `rfp-emailer` repos** — 20% probability
   - Pros: Maximum separation, could swap email provider independently
   - Cons: Over-engineering for what's essentially one pipeline with two stages, emailer is tiny (template + SES call), adds coordination overhead

**Recommendation: (a) Combined.** The emailer is a thin layer on top of analysis output. It's ~100 lines of template rendering + SES. Splitting it into its own repo/service would be over-engineering. The natural flow is: fetch unanalyzed tenders → analyze → rank → store results → assemble email → send. That's one pipeline.

### DECISION 3: Analysis Pipeline — Compute Model

**Options:**

a) **Lambda (Step Functions orchestration)** — 60% probability
   - Pros: Scales to zero, pay-per-use, Step Functions handles retries/parallelism/state natively, each tender analysis is independent (map state), fits well under 15-min Lambda timeout per tender, cost-effective at low volume
   - Cons: Step Functions adds complexity, cold starts on LLM SDK, 15-min limit per invocation (but single tender analysis should be <2 min)

b) **ECS Fargate Spot (like the scraper)** — 25% probability
   - Pros: Familiar pattern, no timeout limits, can process large batches in one go
   - Cons: Minimum billing granularity (1 min), overkill for what might be 5-20 tenders per run, slower to start than Lambda

c) **Single Lambda on a schedule (EventBridge)** — 15% probability
   - Pros: Simplest possible, one Lambda processes all pending tenders sequentially
   - Cons: 15-min timeout could be tight if many tenders queue up, no parallelism, if it fails midway you lose progress

**Recommendation: (a) Step Functions + Lambda.** The workload is: query API for unanalyzed tenders → fan out → analyze each independently → collect results → optionally send email. This maps perfectly to Step Functions Map state. Each tender analysis (read description + call Bedrock + store result) fits easily in a Lambda. Cost at 20 tenders/day with Claude Haiku: ~€2-5/month compute + ~€1-3/month Bedrock.

### DECISION 4: LLM Choice for Analysis

**Options:**

a) **Amazon Bedrock (Claude 3.5 Haiku)** — 40% probability
   - Pros: Native AWS integration, no API keys to manage, IAM auth, cheapest Claude model ($0.25/1M input, $1.25/1M output), fast, stays within AWS ecosystem
   - Cons: Bedrock availability in eu-south-2 is limited, **may not have quota approved** — Bedrock model access requires AWS approval per model per account

b) **Fireworks.ai** — 30% probability
   - Pros: Fast inference, competitive pricing, good model selection (Llama, Mixtral, etc.), simple API key auth, OpenAI-compatible API
   - Cons: External dependency, API key management, data leaves AWS

c) **OpenRouter** — 25% probability
   - Pros: Access to many models (Claude, GPT, Llama, Mistral) through one API, can switch models without code changes, OpenAI-compatible API, pay-per-use
   - Cons: External dependency, adds a middleman layer, API key management

d) **OpenAI API directly** — 5% probability
   - Pros: GPT-4o-mini is competitive on price
   - Cons: Locked to one provider

**Recommendation: Abstract the LLM call behind a provider interface.** The analyzer should define a simple `LLMProvider` protocol (async method that takes a prompt, returns structured output). Implement Bedrock, Fireworks, and OpenRouter adapters. Config selects which provider to use. This way:
- Start with whichever provider is available (likely Fireworks or OpenRouter if Bedrock quota isn't approved)
- Switch to Bedrock later if quota comes through
- No code changes needed to swap providers

**RESOLVED:** User may not have Bedrock quota. Design for provider-agnostic LLM access from day one.

### DECISION 5: Where Analysis Results Live

**Options:**

a) **Write back to `rfp-tenders` DynamoDB table (new fields)** — 70% probability
   - Pros: Single source of truth, existing API can expose analysis fields immediately, no new tables, queries stay simple (filter by score, etc.), the scraper API already reads this table
   - Cons: Analyzer needs write access to the scraper's table (cross-service write), schema coupling

b) **Separate `rfp-analysis` DynamoDB table** — 25% probability
   - Pros: Clean ownership boundary, analyzer owns its own data, no risk of corrupting scraper data
   - Cons: API needs to join across tables, more complex queries, extra table cost (negligible)

c) **S3 only (analysis JSON alongside detail.json)** — 5% probability
   - Pros: No DynamoDB changes
   - Cons: Can't query/filter by score or tags without scanning S3

**Recommendation: (a) Write to existing `rfp-tenders` table.** The analysis fields (summary, score, tags, analyzed_at) are attributes of a tender, not a separate entity. The scraper API already serves tender data — adding `analysis_summary`, `relevance_score`, `analysis_tags`, `analyzed_at` fields means the existing `/tenders` endpoint can immediately expose them. The analyzer calls the scraper API to find unanalyzed tenders, then writes results directly to DynamoDB. This does mean the analyzer needs DynamoDB write access, but it's writing to specific fields that the scraper never touches — no conflict.

New fields on `rfp-tenders`:
```
analysis_summary: str | None      # AI-generated summary
analysis_context: str | None      # Why this tender might be relevant
relevance_score: int | None       # 1-10 ranking
analysis_tags: list[str] | None   # Auto-generated tags (sector, type, etc.)
analyzed_at: str | None           # ISO timestamp
analysis_model: str | None        # e.g. "claude-3-haiku-20241022"
emailed_at: str | None            # ISO timestamp of last email inclusion
```

### DECISION 6: Email Service

**Options:**

a) **Amazon SES** — 90% probability
   - Pros: Native AWS, €0 for first 62K emails/month (from Lambda/EC2), simple API, handles bounces/complaints, already in AWS ecosystem
   - Cons: Need to verify domain/email, sandbox mode initially (need to request production)

b) **SendGrid/Mailgun** — 10% probability
   - Pros: Better templates, analytics
   - Cons: External dependency, API keys, cost, unnecessary for low-volume internal emails

**Recommendation: (a) SES.** We're sending 1-2 emails per day to a small list. SES is free at this volume and native to AWS.

### DECISION 7: Web App — Tech Stack & Hosting

**Options:**

a) **React/Next.js on S3 + CloudFront (static SPA)** — 50% probability
   - Pros: Cheapest hosting (~€0.50/month), scales infinitely, no server to manage, all logic in the browser calling the existing API, familiar stack
   - Cons: No SSR (but not needed for an internal tool), need to handle auth client-side

b) **React/Next.js on Amplify Hosting** — 30% probability
   - Pros: Managed deployment, preview environments, built-in CI/CD from Git, supports SSR if needed later, still cheap (~€1-2/month)
   - Cons: Slightly more opinionated, Amplify abstractions can be frustrating

c) **Streamlit** — 15% probability
   - Pros: Fastest to build, Python (same as backend), good for data exploration UIs, no frontend skills needed
   - Cons: Limited customization, not great for production UIs, hosting options are awkward (ECS or EC2), doesn't scale well, hard to make it look professional

d) **Plain HTML/JS (no framework)** — 5% probability
   - Pros: Zero build step, simplest possible
   - Cons: Painful for anything beyond trivial UI, no component reuse

**Recommendation: (a) S3 + CloudFront SPA, likely React with Vite.** This is an internal tool for a small team. A static SPA calling the existing API is the simplest production-grade approach. No server to manage, near-zero cost, and React/Vite gives a modern DX without the complexity of Next.js (we don't need SSR). CloudFront provides HTTPS and caching. The API already exists — the web app is purely a presentation layer.

If speed of initial build matters more than long-term maintainability, Streamlit is a viable MVP — but it becomes a liability quickly. Better to spend the extra day setting up React properly.

### DECISION 8: Web App Authentication

**Options:**

a) **Cognito User Pool + API Gateway JWT authorizer** — 70% probability
   - Pros: Native AWS, handles login/signup/password reset, JWT tokens work with API Gateway directly, can share the authorizer with the existing API (replace API key auth for browser clients), Amplify UI has pre-built React login components
   - Cons: Cognito UX is notoriously clunky to configure, overkill for <5 users

b) **Keep API key auth, hardcode in the SPA** — 20% probability
   - Pros: Zero auth infrastructure, works today, fine for 1-3 internal users
   - Cons: API key in client-side JS is visible (but API is internal-only anyway), no user identity, can't revoke per-user

c) **CloudFront + Lambda@Edge basic auth** — 10% probability
   - Pros: Simple password gate on the entire site
   - Cons: Terrible UX, no token-based API auth, doesn't integrate with API Gateway

**Recommendation: (a) Cognito, but defer until the web app is actually built.** For the initial build, (b) is fine — embed the API key in the SPA config, restrict API Gateway to low rate limits. When more users need access or you want proper identity, add Cognito. The API Gateway already supports swapping authorizers without changing the API.

### DECISION 9: Analysis Pipeline — What to Analyze

The analyzer should produce, per tender:

1. **Summary** (2-3 sentences) — What is this tender about, who's issuing it, what's the scope
2. **Relevance context** (2-3 sentences) — Why this might be a good fit based on the company's profile (configurable prompt)
3. **Relevance score** (1-10) — Numeric ranking for sorting
4. **Tags** — Auto-extracted: sector, geography, tender type, estimated effort level

Input to the LLM per tender:
- `description.txt` from S3 (plain text, already extracted by scraper)
- Tender metadata from DynamoDB (title, organization, budget, deadline, location, sectors)
- Company profile context (static prompt prefix, stored in config)

This should be a single LLM call per tender with a structured output prompt. Haiku can handle this in <5 seconds per tender.

### DECISION 10: Email Digest Format

- HTML email (SES supports it natively)
- Sections: date range header, summary stats, top-ranked tenders (score ≥ 7?), then remaining tenders grouped by score band
- Per tender in email: title, organization, score badge, 1-line summary, deadline, link to web app detail page
- Frequency: configurable, start with once daily (morning)
- Recipients: configurable list (start with 1-2 emails, stored in config or SSM Parameter)

## Constraints Discovered

1. **Bedrock regional availability**: eu-south-2 (Spain) may not have Bedrock. Analyzer Lambda can call Bedrock in eu-west-1 (Ireland) — adds ~50ms latency per call, irrelevant for batch processing.
2. **SES sandbox**: New SES accounts start in sandbox mode (can only send to verified emails). Need to request production access or verify recipient emails individually. Fine for a small recipient list.
3. **Cross-service DynamoDB writes**: The analyzer writing to `rfp-tenders` means it needs IAM permissions on the scraper's table. This is a conscious coupling — the alternative (separate table) adds query complexity for minimal benefit.
4. **Scraper API as the contract**: The analyzer should read tender data via the HTTP API, not directly from DynamoDB. This keeps the API as the single interface. But it writes analysis results directly to DynamoDB (the API is read-only by design).
5. **Email rendering**: SES sends raw HTML. No template engine needed — Python f-strings or Jinja2 for the email body. Keep it simple.

## Integration Points

```
                    ┌─────────────────────┐
                    │   rfp-scraper       │
                    │   (this repo)       │
                    │                     │
                    │  Scraper → DynamoDB  │
                    │  Scraper → S3       │
                    │  API ← DynamoDB     │
                    │  API ← S3           │
                    └──────┬──────────────┘
                           │ HTTP API
              ┌────────────┼────────────────┐
              │            │                │
              ▼            ▼                ▼
   ┌──────────────┐  ┌──────────┐  ┌──────────────┐
   │ rfp-analyzer  │  │ rfp-web  │  │  Postman     │
   │              │  │          │  │  (manual)    │
   │ Read: API    │  │ Read:    │  └──────────────┘
   │ Write: DDB   │  │  API     │
   │ Read: S3     │  │          │
   │ Send: SES    │  │          │
   └──────────────┘  └──────────┘
```

### rfp-analyzer reads/writes:
- **Reads** (via scraper HTTP API): `GET /tenders?status=completed` to find unanalyzed tenders, `GET /tenders/{source_id}/{tender_id}` for full detail + description
- **Reads** (S3 direct): `description.txt` for the full text input to LLM (avoids API response size limits)
- **Writes** (DynamoDB direct): `analysis_summary`, `relevance_score`, `analysis_tags`, `analyzed_at`, `emailed_at` fields on `rfp-tenders`
- **Sends** (SES): Email digest to recipient list

### rfp-web reads:
- **Reads** (via scraper HTTP API): All existing endpoints + new analysis fields exposed through the same API
- No direct AWS access — pure API consumer

## Proposed AWS Resources (New)

### rfp-analyzer
| Resource | Details | Est. Cost |
|----------|---------|-----------|
| Step Functions state machine | Orchestrates analysis pipeline | ~€0.50/month |
| Lambda (analyzer) | Per-tender analysis, 256MB, 2-min timeout | ~€0.10/month |
| Lambda (email-sender) | Assembles + sends digest, 256MB, 30s timeout | ~€0.01/month |
| Lambda (trigger) | EventBridge → kicks off Step Functions | ~€0.01/month |
| EventBridge schedule | Every 6 hours (configurable) | Free |
| Bedrock or external LLM | ~20 tenders/day × ~2K tokens each | ~€1-5/month |
| SES | 1-2 emails/day | Free tier |
| CloudWatch Logs | 3 Lambda log groups | ~€0.20/month |
| **Subtotal** | | **~€2-5/month** |

### rfp-web
| Resource | Details | Est. Cost |
|----------|---------|-----------|
| S3 bucket (static hosting) | React SPA build artifacts | ~€0.01/month |
| CloudFront distribution | HTTPS, caching, custom domain | ~€0.50/month |
| Route 53 (optional) | Custom domain | €0.50/month |
| **Subtotal** | | **~€0.50-1/month** |

### Total new cost: ~€3-6/month
### Grand total (all services): ~€11-18/month

## Open Questions

- [x] ~~Company profile for relevance scoring~~ — **RESOLVED:** User has a draft. Store as config file in the analyzer repo.
- [x] ~~Email recipient list management~~ — **RESOLVED:** Small team, no subscribe/unsubscribe needed. Simple config list (YAML or SSM Parameter Store).
- [x] ~~Score threshold for email inclusion~~ — **RESOLVED:** Make it a configuration setting. Start with all tenders, adjustable.
- [x] ~~Web app urgency~~ — **RESOLVED:** Needed soon — also serves as scraper run visibility tool. Build in parallel with analyzer, not after.
- [x] ~~LLM provider~~ — **RESOLVED:** May not have Bedrock quota. Design provider-agnostic (Fireworks.ai / OpenRouter as alternatives). See Decision 4.
- [ ] Is Bedrock quota available in the account? If yes, use it. If not, start with Fireworks.ai or OpenRouter.
- [ ] Web app: custom domain or just the CloudFront URL for now?
- [ ] Should the analyzer also process document PDFs (extract text, summarize)? Deferred — start with `description.txt` only. PDF extraction adds complexity (Textract or PyPDF2) and cost.

## Implementation Sequence

**Tracks 1 and 2 can run in parallel:**

### Track 1: rfp-analyzer
1. Set up repo with provider-agnostic LLM interface
2. Implement LLM adapters (Fireworks/OpenRouter first, Bedrock when quota available)
3. Build analysis Lambda + Step Functions workflow
4. Add analysis fields to `rfp-tenders` schema
5. Build email Lambda (SES + HTML template, configurable score threshold + recipient list)
6. Deploy, test with real tenders

### Track 2: rfp-web (needed soon — scraper visibility + analysis review)
1. Set up repo, Vite + React, deploy to S3 + CloudFront
2. Build run/debug view first (scraping runs, per-run tenders) — immediate value
3. Build tender list view (date range, filters, sort by score)
4. Build tender detail view (summary, analysis, documents)
5. API key auth initially, Cognito later

### Track 3: Scraper API updates (in this repo, small, unblocks both tracks)
1. Add analysis fields to `TenderDetailResponse` and `TenderListItem` models
2. Add `analyzed` filter + sort-by-score to `GET /tenders`
3. Add `GET /tenders/summary` endpoint
4. Add CORS headers (needed for web app)

## Next Steps

1. Check Bedrock quota in the AWS account — if unavailable, set up Fireworks.ai or OpenRouter API key in Secrets Manager
2. Create `rfp-analyzer` repo skeleton with provider-agnostic LLM interface
3. Draft the analysis prompt using the existing company profile draft
4. Create `rfp-web` repo skeleton (Vite + React), deploy empty shell to S3 + CloudFront
5. Update scraper API models to include analysis fields + CORS
6. Build both tracks in parallel
