# Tender Detail Page Redesign

## What We're Building
A redesigned tender detail page with proper information hierarchy: verdict-first layout, tabbed match fitness section, and state-aware rendering that adapts to tender lifecycle (skipped, legacy, fully-analyzed).

## Core Problem
The current page is a flat vertical dump of 12+ sections at equal visual weight. Users can't quickly answer "should I pursue this?" — the most important information (score, AI summary, match fitness) competes with operational buttons, legacy fields, and raw procurement text.

## Key Decisions Made

### 1. Layout Structure — Four-zone hierarchy
Decision: **Verdict-first progressive disclosure** (confirmed)

```
1. HEADER: Title, org, score badge, deadline, location, source link, feedback
2. VERDICT ZONE: Unified score + factor bars | AI Summary + Fit Analysis
3. MATCH FITNESS: Tabs [Team | References | Exclusion]
4. DETAILS: Key facts, documents, description (hidden by default)
5. DEVELOPER: System Info + Audit Trail (collapsed)
```

### 2. Skipped tenders — No detail page
Decision: **Remove detail page for skipped tenders** (confirmed)
- Show skip reason via tooltip/popover on list page
- Provide direct source-website link from the list row
- Removes a confusing mostly-empty page

### 3. Match Fitness — Tabbed layout
Decision: **Tabs: Team | References | Exclusion** (confirmed)
- Each tab merges requirements + match result into one view per dimension
- Score factor bars in Verdict Zone hint which tab needs attention (color-coded)
- Reduces vertical scroll dramatically

### 4. Action buttons — Demote to dropdown
Decision: **Move Extract/Run/Check to a "Actions" dropdown** (confirmed)
- Placed in tab header or page header
- Power-user operations, not primary UI
- Still accessible when needed (e.g., after updating team roster)

### 5. Description — Hidden when AI summary exists
Decision: **Hidden by default, "View raw description" link** (confirmed)
- AI summary covers the read need
- If no AI summary (legacy unanalyzed), show description expanded
- Raw text is mostly boilerplate

### 6. Legacy Eligibility — Fold into Match Fitness tabs
Decision: **Adapt tab content based on data availability** (confirmed)
- New extraction available → show structured data
- Only legacy eligibility → show legacy notes in the relevant tab
- No confusing duplicate sections

## State-Aware Rendering

| Tender State | Renders |
|---|---|
| Skipped | No detail page (handled at list level) |
| Completed, unanalyzed | Header + Key Facts + Description (expanded) + Documents |
| Legacy analyzed | Header + Verdict Zone + Legacy eligibility in tabs + Documents |
| Fully analyzed | Header + Verdict Zone + Match Fitness tabs + Documents |

## Information Removals/Relocations

| Current | Change |
|---|---|
| Tags in Key Facts grid | Move to header as subtle pills |
| "Types" field | Remove (always "consulting services") |
| Feedback buttons between header/content | Integrate into header as small icons |
| "Posted Date" in key facts | Remove (deadline is what matters) |
| "Unified Score: not computed yet" | Don't render the section at all |
| "Tender Type" raw value | Keep but humanize labels |

## Constraints Discovered
- Three distinct tender states require different rendering strategies
- Team/Reference/Exclusion each have a two-stage data model (extracted requirements → match result)
- Legacy eligibility fields (experts_required, references_required, turnover_required) coexist with new structured data — supersession logic already exists
- Action buttons serve a real but rare use case (re-running after roster changes)
- Audit trail is developer/ops tooling, not end-user

## Verification Plan
- Each state (skipped, unanalyzed, legacy, fully-analyzed) renders correctly with live API data
- Tabs switch cleanly; only relevant content shows per state
- No regression: all existing data remains accessible (just reorganized)
- Empty states don't show confusing "not computed yet" messages
- Action buttons functional from their new location

## Implementation Scoping (Suggested Specs)

Breaking this into small, independent specs:

1. **Spec: Skipped tender list handling** — Add skip reason tooltip + source link to list, block navigation to detail page for skipped tenders
2. **Spec: Verdict Zone** — New header layout with integrated score + AI summary side-by-side
3. **Spec: Match Fitness Tabs** — Replace linear sections with tabbed Team/References/Exclusion, merge requirements + match per tab
4. **Spec: Details cleanup** — Collapse description, remove low-value fields, relocate tags/feedback
5. **Spec: Actions dropdown** — Move Extract/Run/Check buttons into a dropdown menu

Order: 2 → 3 → 4 → 5 → 1 (verdict zone first since it's the most impactful, skipped tenders last since it touches the list page)

## Open Questions
- [ ] Should "re-run" actions show a staleness indicator (e.g., "Team roster updated since last match") or just always be available?
- [ ] Do we want a "Quick Actions" bar at the top (Download all docs, Open on source, Share)?
- [ ] Should the tabs remember which was last selected across tenders (localStorage)?
