# Frontend v2 — Implementation Order

Date: 2026-07-21
Tracks: `docs/frontend-v2-requirements.md`

---

## Approach

Implement in dependency order. Each section is one spec-sized unit — reviewable and testable independently. Complete one before starting the next.

## Testing Principles

- **Unit/property tests**: Limited to pure utility functions and non-trivial logic only. No component render tests or snapshots — product is evolving too fast for those to provide value.
- **Playwright smoke tests**: Written at the END of each phase as the verification gate. Cover critical user flows against local dev server + local API (`.env.local`).
- **Build pass** (`npm run build`) is the primary CI gate during implementation.

---

## Phases

### Phase 1: Settings (§11)
**Status: up next**
**Scope:** Add `interestingness` and `digest` setting types to existing Settings page.
**Why first:** Zero dependencies, extends proven pattern, configures pipeline behavior.
**Brainstorm:** `.kiro/docs/brainstorms/frontend-v2-settings.md`

---

### Phase 2: Tender List Enhancements (§1)
**Status: up next**
**Scope:** Full-text search bar (`q` param), new score columns (interestingness, unified), `min_interestingness` filter.
**Why second:** Quick wins, standalone, no new pages needed.
**Brainstorm:** `.kiro/docs/brainstorms/tender-list-enhancements.md`

---

### Phase 3: Team Management (§5)
**Status: up next**
**Scope:** New `/team` route. CRUD list + detail pages, CV upload (multipart), extraction status.
**Why third:** Standalone CRUD, net-new pages. Required before References.
**Brainstorm:** `.kiro/docs/brainstorms/team-management.md`

---

### Phase 4: References Management (§6)
**Status: pending**
**Scope:** New `/references` route. CRUD list + detail, document upload, expert linking (to Team), re-extraction trigger.
**Why fourth:** Depends on Team existing (experts_involved links to team member UUIDs).

---

### Phase 5: Tender Detail Overhaul (§2–4, 6–9, 10)
**Status: pending**
**Scope:** Team requirements + match display, reference requirements + match display, exclusion criteria, unified score breakdown, audit trail, feedback (thumbs up/down). All on the existing tender detail page.
**Why last:** Largest section. Team match/reference match displays only make sense once Team + References exist.

---

## Notes

- Each phase gets its own brainstorm doc before implementation starts
- Existing functionality (runs, current settings, current tender list/detail) remains intact throughout
- API client needs `apiPost` and `apiDelete` helpers added before Phase 3 (Team CRUD)
