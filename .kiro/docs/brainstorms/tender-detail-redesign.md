# Tender Detail Page Redesign — Brainstorm

## What We're Building
Reorganize the tender detail page to prioritize information from the perspective of a Green Partners employee evaluating tenders for bid/no-bid decisions. Push technical/scraper metadata into secondary positions.

## Key Decisions Made

- **Information hierarchy**: Three-tier layout (🟢 85%) — "At a Glance" → "Requirements & Details" → "System Info"
- **Scraper/system metadata**: Hybrid approach (🟡 60%) — Tooltips for model/analyzed_at, collapsible section for full scraper block
- **Long description**: Collapsible with preview (🟢 80%) — Show first ~4-6 lines, toggle to expand
- **Requirements sections**: Consolidated (🟢 80%) — Single "Eligibility Requirements" section with sub-groups

## Proposed Section Order

1. **Header**: Title, org, relevance score (prominent), status badge (smaller)
2. **Key Facts** (card/grid): Budget, Deadline, Location, Tender Type, Posted Date, Sectors, Types, Tags
3. **AI Assessment**: Context first (short, high-value fit analysis), then Summary
4. **Eligibility Requirements**: Experts + References + Turnover consolidated
5. **Description**: Collapsible with ~4-6 line preview
6. **Documents**: Table (unchanged)
7. **System Info** (collapsed by default): Scraper status, run links, model, analyzed_at, retry count, emailed_at, etc.

## Resolved Questions

- [x] `status_name` — Human-readable label from DevelopmentAid API (e.g. "Active", "Closed", "Forecast"). Show in header area near status badge. Currently has a parser bug being fixed.
- [x] `sectors` / `types` — Will have values (e.g. "Energy, Financial Services & Audit", "consulting services"). Show in Key Facts grid.
- [x] Relevance score — Should be prominent. Large colored visual treatment in the header.
- [x] `emailed_at` — Will be added to API later. Add to TypeScript interface now with value UNKNOWN. Display in System Info section when available.
- [x] Context vs Summary — Context is primary (short, targeted fit analysis for Green Partners). Summary is secondary (longer general description). Show Context first and more prominently.

## Fields by Priority Tier

### Tier 1 — "Should I keep reading?" (always visible, top of page)
- Title
- Relevance score (large, colored)
- Organization
- Budget
- Deadline
- Location
- Context (AI fit analysis)
- Tags
- Tender type
- Sectors / Types

### Tier 2 — "Can we bid?" (visible, middle of page)
- Experts required (international, local, key, total, notes)
- References required (count, type, value, timeline, notes)
- Turnover required (annual, years, notes)
- Full description (collapsible)
- Documents

### Tier 3 — "System details" (collapsed by default)
- Scraper status, retry count, last attempt, last error
- Docs downloaded / failed
- Skip reason
- Run links (discovery, processing)
- Analysis model, analyzed_at
- Emailed_at
- source_id, tender_id (keep in header but de-emphasized)
- Posted date, status_name

## Next Steps

1. Create spec for the redesign
2. Implement — mostly reorganization of existing page + collapsible sections + tooltip component
