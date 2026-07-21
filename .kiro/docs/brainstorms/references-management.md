# References Management (Phase 4) Brainstorm

## What We're Building

New `/references` route with CRUD list + detail pages, document upload (multipart), expert linking (to Team member UUIDs), LLM extraction status, and manual re-extraction trigger. Second net-new entity in the app, structurally mirrors Team Management.

## Core Problem

Green Partners needs to manage their portfolio of past projects/references so the analyzer can match them against tender reference requirements. Currently no UI exists — reference data can only be managed via direct API calls.

## Key Decisions Made

- **Page structure**: Two pages — `/references` list + `/references/:id` detail (🟢 90%) — matches Team pattern, detail view is too rich for a panel
- **Create flow**: Dialog from list page (🟢 70%) — required: `title`; optional in dialog: `client`, `sector`, `region`, `year`, `budget_eur`. Everything else on detail page.
- **After create**: Auto-navigate to detail page — user can immediately upload documents, link experts, add description
- **Expert linking**: Searchable multi-select on detail page (🟢 75%) — fetches `/team?search=...`, displays linked experts as removable chips showing name + roles. Not in create dialog.
- **Document management**: Upload button on detail page + document list with download links and per-document delete (🟢 85%). Same file validation as Team CV (PDF/DOCX, 10MB). Supports multiple documents per reference.
- **Re-extraction**: Manual "Re-extract" button on detail + info banner when description changes (🟢 80%) — same pattern as Team's notes re-extraction warning
- **List filters**: Search (debounced text), sector (text input), year (number input) — all optional
- **List pagination**: Page-based `useInfiniteQuery` with "Load more" button (🟢 85%) — API uses `page`/`total_pages`
- **Extracted fields display**: Render known fields semantically (🟢 70%) — `themes` as tags, `donor`/`countries`/`type` as text, `key_deliverables` as list, `budget_range` as range text
- **Consortium partners**: Comma-separated text input on detail page — free text strings, no external linking
- **Extraction status**: Same colored badge pattern as Team (pending=yellow, completed=green, failed=red)
- **Delete**: Confirmation dialog with irreversibility warning (removes S3 documents)

## Constraints Discovered

- API client helpers (`apiPost`, `apiDelete`, `apiUpload`) already exist from Phase 3 — no new infra needed
- API uses page-based pagination (`page`/`total_pages`) — same as Team
- `experts_involved` is array of team member UUIDs (max 50) — need team search for the linking UI
- Document upload is `multipart/form-data` (same as Team CV) — reuse `apiUpload` helper
- Document upload and delete both auto-trigger re-extraction — response reflects updated state
- Description change on PUT also triggers re-extraction — need warning banner
- `year` validation: 1990-2030; `budget_eur` validation: >= 0
- `extracted_fields` is freeform object — shape may evolve; render known fields, ignore unknowns
- Detail response includes `enriched_experts` (id, name, roles) and `document_urls` (filename, presigned_url) — no extra API calls needed to display linked data
- Presigned document URLs expire after 1 hour

## Integration Points

- `src/api/types.ts`: add `ReferenceListItem`, `ReferenceResponse`, `ReferenceCreate`, `ReferenceUpdate`, `ReferenceListParams`, `EnrichedExpert`, `DocumentInfo`, `ExtractedFields`
- `src/api/endpoints.ts`: add `getReferences`, `getReference`, `createReference`, `updateReference`, `deleteReference`, `uploadReferenceDocument`, `deleteReferenceDocument`, `extractReference`
- `src/hooks/useReferences.ts`: `useReferenceList`, `useReferenceDetail`, `useCreateReference`, `useUpdateReference`, `useDeleteReference`, `useUploadDocument`, `useDeleteDocument`, `useExtractReference`
- `src/pages/ReferenceListPage.tsx`: paginated list with search + sector + year filters + create dialog
- `src/pages/ReferenceDetailPage.tsx`: editable form + expert linking multi-select + document upload/list/delete + extracted fields display + re-extract button + delete
- `src/App.tsx`: add `references` and `references/:id` routes
- Nav bar in `src/layouts/`: add References link
- `src/utils/document-validation.ts`: file validation (PDF/DOCX, 10MB) — extracted from cv-validation pattern for reuse

## Testing Strategy

Same as Phase 3:

- **Unit/property tests**: Only for pure utility functions (document validation).
- **Smoke tests (Playwright)**: Written at END of implementation. Cover:
  - List page loads, shows references
  - Create dialog → submit → navigates to detail
  - Detail page edits → save → persists
  - Document upload → extraction status updates
  - Expert linking → save → enriched experts display
  - Document delete → confirmation → removed from list
  - Delete reference → confirmation → removed from list
  - Re-extract button → extraction_status updates

## Verification Plan

- `npm run build` passes (no type errors)
- Manual browser check: all flows work against local API (`.env.local`)
- Playwright smoke tests pass for critical paths (written last)
- Empty state (no references) renders gracefully
- Expert linking works with real team member data
- Document download links open correctly (presigned URLs)
- Re-extraction warning appears when description is modified

## Open Questions

- [ ] Should the expert linking multi-select load all team members upfront or search-as-you-type? (Likely search — team could grow large)
- [ ] Document download: open in new tab or trigger browser download? (New tab — consistent with tender document behavior)

## Next Steps (spec breakdown)

1. **Spec A: Types + endpoints + hooks** — reference types, endpoint functions, TanStack Query hooks, document validation util
2. **Spec B: Reference list page** — route, page component, search/sector/year filters, create dialog, pagination
3. **Spec C: Reference detail page** — editable form, expert linking multi-select, document upload/list/delete, extracted fields, re-extract, delete
