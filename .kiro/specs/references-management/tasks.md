# Implementation Plan: References Management

## Overview

Implements the References Management feature as a two-page CRUD flow (`/references` list + `/references/:id` detail) mirroring the existing Team Management pattern. The plan is split into three phases: data layer (types, endpoints, hooks, validation utility), list page with create dialog, and detail page with expert linking, document management, extracted fields, re-extraction, and delete. Each phase builds on the previous.

## Tasks

- [x] 1. Data layer — types, endpoints, hooks, and document validation
  - [x] 1.1 Add reference TypeScript types to `src/api/types.ts`
    - Add `ReferenceExtractionStatus`, `EnrichedExpert`, `DocumentInfo`, `ExtractedFields`, `ReferenceListItem`, `ReferenceResponse`, `ReferenceCreate`, `ReferenceUpdate`, `ReferenceListParams` types as defined in the design document
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

  - [x] 1.2 Add reference endpoint functions to `src/api/endpoints.ts`
    - Add `getReferences`, `getReference`, `createReference`, `updateReference`, `deleteReference`, `uploadReferenceDocument`, `deleteReferenceDocument`, `extractReference` functions using existing `apiFetch`/`apiPost`/`apiPut`/`apiDelete`/`apiUpload` helpers
    - Import the new types from `src/api/types.ts`
    - _Requirements: 1.10, 1.11, 1.12, 1.13, 1.14, 1.15, 1.16, 1.17, 1.18_

  - [x] 1.3 Create `src/hooks/useReferences.ts` with TanStack Query hooks
    - Implement `useReferenceList` (useInfiniteQuery, queryKey `['references', { search, sector, year }]`), `useReferenceDetail` (useQuery, queryKey `['reference', id]`), `useCreateReference`, `useUpdateReference`, `useDeleteReference`, `useUploadDocument`, `useDeleteDocument`, `useExtractReference` mutation hooks
    - Follow the exact same pattern as `useTeam.ts`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [x] 1.4 Create `src/utils/document-validation.ts`
    - Implement `validateDocument(file: File): string | null` — check size first (>10MB → error), then MIME type (only PDF/DOCX → else error), return `null` for valid files
    - Same signature pattern as `validateCvFile` in `cv-validation.ts`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 1.5 Write property tests for `validateDocument` in `src/utils/document-validation.test.ts`
    - **Property 1: Size-first error ordering** — when both MIME and size are invalid, size error returned
    - **Property 2: Idempotence** — validating twice yields same result
    - **Property 3: Valid files always return null** — accepted MIME + size ≤ 10MB → null
    - **Property 4: Oversized files always return error** — size > 10MB → non-empty string
    - **Property 5: Invalid MIME types return error** — size ≤ 10MB + wrong MIME → non-empty string
    - Use `fast-check` with 100+ iterations per property
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6**

- [x] 2. Checkpoint — Ensure build passes and property tests pass
  - Run `npm run build` and `npm run test` to verify no type errors and validation tests pass. Ask the user if questions arise.

- [x] 3. Reference list page with routing and navigation
  - [x] 3.1 Register routes and add nav link
    - Add `references` and `references/:id` routes in `src/App.tsx` nested inside AppLayout
    - Add "References" NavLink in `src/layouts/AppLayout.tsx` between "Team" and "Settings" using the same `cn()` className pattern
    - Import placeholder components (created in next tasks)
    - _Requirements: 12.1, 12.2, 12.4_

  - [x] 3.2 Create `src/pages/ReferenceListPage.tsx` with filters, table, and pagination
    - Page header with title "References" + description + "Add Reference" button
    - Search input (debounced 300ms), sector text input, year text input as filters
    - Table with columns: title, client, sector, year, budget (formatted €X,XXX or "—"), extraction_status (colored badge: yellow=pending, green=completed, red=failed)
    - Empty state messages (no references vs no matches)
    - "Load more" button using `fetchNextPage` from `useReferenceList`
    - Row click navigates to `/references/:id`
    - Loading spinner and ErrorAlert with retry
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12_

  - [x] 3.3 Add CreateReferenceDialog to the list page
    - Dialog with fields: title (required, max 200), client (optional, max 200), sector (optional, max 100), region (optional, max 100), year (optional, 1990-2030), budget_eur (optional, 0-999999999.99)
    - Submit disabled until title has non-whitespace content
    - Inline validation for year range and budget range
    - On success: close dialog + navigate to `/references/:id`
    - On error: show error message, preserve form data, re-enable submit
    - Close without confirmation discards data
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [x] 4. Checkpoint — Ensure build passes and list page renders
  - Run `npm run build` to verify no type errors. Ask the user if questions arise.

- [x] 5. Reference detail page — view, edit, and delete
  - [x] 5.1 Create `src/pages/ReferenceDetailPage.tsx` with editable form and save
    - Display all fields: title, client, sector, region, year, budget_eur, description, consortium_partners (comma-separated input), extraction_status badge, created_at, updated_at
    - Always-editable form inputs with character limits (title 200, client 200, sector 100, region 100, description 5000, consortium_partners 1000)
    - Validation: title non-empty, year 1990-2030, budget_eur 0-999999999.99
    - Save button sends PUT with only changed fields; disabled during request; success toast (3s auto-dismiss); error toast (5s)
    - No-op if no fields changed
    - Loading skeleton while data loads; 404 → not found message + back link
    - "← Back to references" link in header
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.10, 12.3_

  - [x] 5.2 Add expert linking section to the detail page
    - Display linked experts as removable chips (name + roles) from `enriched_experts`
    - Searchable input (debounced 300ms) fetching `GET /team?search=...&page_size=20`
    - Dropdown with selectable results (excluding already-linked experts)
    - Empty state "No team members found" when search returns nothing
    - Adding/removing experts modifies `experts_involved` array
    - Max 50 experts — disable search + show message when limit reached
    - Changes saved via the main Save button (PUT request includes `experts_involved`)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 5.3 Add document management section to the detail page
    - Upload button accepting PDF/DOCX (validated via `validateDocument`)
    - Document list showing filename + download link (opens presigned_url in new tab) + delete button
    - Empty state when no documents
    - Upload: validate → multipart POST → invalidate query → show updated extraction_status
    - Loading indicator + disabled upload control during upload
    - Inline error if validation fails (no API call)
    - Delete: confirmation dialog ("irreversible") → DELETE request → invalidate query
    - Toast/inline error on upload or delete failure
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_

  - [x] 5.4 Add extracted fields display section
    - Read-only section with heading "Extracted Data"
    - Render `themes` as Badge components, `donor`/`type`/`budget_range` as plain text, `countries` as comma-separated text, `key_deliverables` as bulleted list
    - Show "No extracted data available" when `extracted_fields` is null or all fields empty
    - Omit fields that are empty/null; ignore unknown fields
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10_

  - [x] 5.5 Add re-extraction controls
    - "Re-extract" button visible when documents exist; triggers POST `/references/:id/extract`
    - Button disabled + loading indicator during request; updates extraction_status badge on success
    - Button disabled when extraction_status is "pending"
    - Re-extraction warning banner below description when description differs from saved value AND documents exist
    - Warning hidden when description reverts to saved value; hidden when no documents
    - Toast error on re-extraction failure, button re-enabled
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 5.6 Add delete reference with confirmation dialog
    - "Delete" button with AlertDialog confirmation showing reference title + irreversibility warning
    - On confirm: disable button, DELETE request, invalidate `['references']`, navigate to `/references`
    - On failure: show error, re-enable confirm, dismiss dialog
    - Cancel dismisses dialog with no action
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 6. Final checkpoint — Ensure build passes and all tests pass
  - Run `npm run build` and `npm run test`. Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the `validateDocument` correctness properties from the design
- The feature mirrors the Team Management pattern — reference `TeamListPage.tsx`, `TeamDetailPage.tsx`, and `useTeam.ts` as implementation guides
- The detail page is intentionally one task (5.1) for core form + five feature tasks (5.2-5.6) since all render on the same page component

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.4"] },
    { "id": 2, "tasks": ["1.3", "1.5"] },
    { "id": 3, "tasks": ["3.1"] },
    { "id": 4, "tasks": ["3.2"] },
    { "id": 5, "tasks": ["3.3"] },
    { "id": 6, "tasks": ["5.1"] },
    { "id": 7, "tasks": ["5.2", "5.3", "5.4"] },
    { "id": 8, "tasks": ["5.5", "5.6"] }
  ]
}
```
