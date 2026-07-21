# Frontend v2 — Implementation Order

Date: 2026-07-21
Tracks: `docs/frontend-v2-requirements.md`

---

## Approach

Implement in dependency order. Each section is one spec-sized unit — reviewable and testable independently. Complete one before starting the next.

---

## Phases

### Phase 1: Settings (§11)
**Status: up next**
**Scope:** Add `interestingness` and `digest` setting types to existing Settings page.
**Why first:** Zero dependencies, extends proven pattern, configures pipeline behavior.
**Brainstorm:** `.kiro/docs/brainstorms/frontend-v2-settings.md`

---

### Phase 2: Tender List Enhancements (§1)
**Status: pending**
**Scope:** Full-text search bar (`q` param), new score columns (interestingness, unified), `min_interestingness` filter.
**Why second:** Quick wins, standalone, no new pages needed.

---

### Phase 3: Team Management (§5)
**Status: pending**
**Scope:** New `/team` route. CRUD list + detail pages, CV upload (multipart), extraction status.
**Why third:** Standalone CRUD, net-new pages. Required before References.

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
