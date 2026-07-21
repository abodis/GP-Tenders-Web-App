# Team Management (Phase 3) Brainstorm

## What We're Building

New `/team` route with CRUD list + detail pages, CV upload (multipart), and LLM extraction status display. First net-new entity pages in the app.

## Core Problem

Green Partners needs to manage their team roster (employees + contractors) so the analyzer can match team members to tender requirements. Currently no UI exists — team data can only be managed via direct API calls.

## Key Decisions Made

- **Page structure**: Two pages — `/team` list + `/team/:id` detail (🟢 85%) — matches existing tender list/detail routing pattern
- **Create flow**: Dialog/modal from list page (🟢 75%) — only 4 fields needed (name/email/type/roles), keeps user in context
- **After create**: Auto-navigate to detail page — user can immediately upload CV and edit notes
- **CV upload**: On detail page only (🟢 80%) — backend requires member ID first; keeps create flow lightweight
- **Detail page mode**: Inline editable fields, always in edit mode (🟢 70%) — matches Settings page pattern
- **Save granularity**: Single save button for whole form (🟢 75%) — one PUT to one resource, not section-based
- **Notes field**: Simple textarea, no markdown preview — internal team notes don't need formatting
- **List pagination**: Page-based `useInfiniteQuery` with "Load more" button (🟢 85%) — API uses `page`/`total_pages`, not cursors
- **Extraction status**: Colored badge (pending=yellow, completed=green, failed=red) on both list and detail
- **Delete**: Confirmation dialog with irreversibility warning

## Constraints Discovered

- `apiPost`, `apiDelete`, `apiUpload` (multipart) do NOT exist yet in `client.ts` — must be added first
- API uses page-based pagination (`page`/`total_pages`) not cursor-based — different from tenders
- CV upload is `multipart/form-data` with 10MB max — needs a different fetch wrapper than JSON helpers
- `extraction_status` is set by backend after CV upload (synchronous LLM extraction) — response returns updated member
- Notes update + existing CV triggers re-extraction — UI should indicate this to user
- Email must be unique across all team members (422 on duplicate)
- `type` is enum: `"employee"` | `"contractor"` only

## Integration Points

- `src/api/client.ts`: add `apiPost`, `apiDelete`, `apiUpload` helpers
- `src/api/types.ts`: add `TeamMember`, `TeamMemberListItem`, `TeamMemberCreate`, `TeamMemberUpdate`, `TeamListParams`
- `src/api/endpoints.ts`: add `getTeamMembers`, `getTeamMember`, `createTeamMember`, `updateTeamMember`, `deleteTeamMember`, `uploadTeamMemberCv`
- `src/hooks/useTeam.ts`: `useTeamList`, `useTeamDetail`, `useCreateMember`, `useUpdateMember`, `useDeleteMember`, `useUploadCv`
- `src/pages/TeamListPage.tsx`: paginated list with search + type filter + create dialog
- `src/pages/TeamDetailPage.tsx`: editable form + CV upload zone + extraction status
- `src/App.tsx`: add `team` and `team/:id` routes
- Nav bar in `src/layouts/`: add Team link

## Testing Strategy

**Principle:** Product is evolving rapidly — heavy unit/property test suites create maintenance drag on changing interfaces. Keep automated tests lean and focused on logic that won't shift with UI changes.

- **Unit/property tests**: Limited. Only for pure utility functions or non-trivial logic (e.g., validation rules, data transformations). No snapshot tests, no component render tests during this phase.
- **Smoke tests (Playwright)**: Written at the END of implementation as the verification gate. Cover the critical user flows:
  - List page loads, shows members
  - Create dialog → submit → navigates to detail
  - Detail page edits → save → persists
  - CV upload → extraction status updates
  - Delete → confirmation → member removed from list
- Smoke tests run against the local dev server + local API (`.env.local`)

## Verification Plan

- `npm run build` passes (no type errors)
- Manual browser check: all flows work against local API
- Playwright smoke tests pass for critical paths (written last)
- Empty state (no team members) renders gracefully
- Duplicate email shows 422 error inline

## Open Questions

- [ ] Should re-extraction warning on notes save be a confirmation dialog or just an info banner?
- [ ] CV download: does the API provide a presigned URL, or do we need a separate endpoint? (check when implementing)

## Next Steps (spec breakdown)

1. **Spec A: API client helpers** — add `apiPost`, `apiDelete`, `apiUpload` to `client.ts`
2. **Spec B: Types + endpoints + hooks** — team types, endpoint functions, TanStack Query hooks
3. **Spec C: Team list page** — route, page component, search/filter, create dialog, pagination
4. **Spec D: Team detail page** — route, editable form, CV upload, delete, extraction status
