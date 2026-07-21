# Implementation Plan: Team Management

## Overview

Implements team member CRUD UI following a layered approach: API client extensions → types → endpoint functions → TanStack Query hooks → page components → routing → tests. Each layer builds on the previous, ensuring no orphaned code.

## Tasks

- [x] 1. API client extensions and team types
  - [x] 1.1 Add `apiPost`, `apiDelete`, and `apiUpload` functions to `src/api/client.ts`
    - `apiPost<T>(path, body)`: JSON POST with `x-api-key` + `Content-Type: application/json`, returns parsed `T`
    - `apiDelete(path)`: DELETE with `x-api-key`, returns void without parsing body
    - `apiUpload<T>(path, body: FormData)`: POST with `x-api-key`, no Content-Type header, returns parsed `T`
    - All follow existing `ApiError` throw pattern on non-2xx
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.2 Add team member type definitions to `src/api/types.ts`
    - `TeamMemberType`, `ExtractionStatus` union types
    - `TeamMemberListItem`, `TeamMemberResponse`, `TeamMemberCreate`, `TeamMemberUpdate`, `TeamListParams` interfaces
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 1.3 Add team endpoint functions to `src/api/endpoints.ts`
    - `getTeamMembers`, `getTeamMember`, `createTeamMember`, `updateTeamMember`, `deleteTeamMember`, `uploadTeamMemberCv`
    - Import and use `apiPost`, `apiDelete`, `apiUpload` from client
    - _Requirements: 2.8, 2.9, 2.10, 2.11, 2.12, 2.13_

- [x] 2. TanStack Query hooks
  - [x] 2.1 Create `src/hooks/useTeam.ts` with all six hooks
    - `useTeamList(type?, search?)`: `useInfiniteQuery` with key `['team-members', { type, search }]`, page-based pagination, `getNextPageParam` returns `page + 1` when `page < total_pages`
    - `useTeamDetail(id)`: `useQuery` with key `['team-member', id]`, disabled when id is undefined/empty
    - `useCreateMember`: `useMutation`, invalidates `['team-members']` on success
    - `useUpdateMember`: `useMutation`, invalidates `['team-members']` + `['team-member', id]`
    - `useDeleteMember`: `useMutation`, invalidates `['team-members']`
    - `useUploadCv`: `useMutation`, invalidates `['team-member', id]`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 3. Checkpoint - Verify API layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Team List Page
  - [x] 4.1 Create `src/pages/TeamListPage.tsx` with list display, search, and filtering
    - Table with columns: name, email, type, roles (tags), extraction_status (colored badge)
    - Search input with 300ms debounce using `q` API param
    - Type filter dropdown (All / Employee / Contractor) using `type` API param
    - "Load more" button using `fetchNextPage` from `useTeamList`
    - Click row → navigate to `/team/:id`
    - Empty state: contextual message (no members vs. no matches)
    - Error state: ErrorAlert with retry
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [x] 4.2 Add CreateMemberDialog to TeamListPage
    - "Add Member" button opens dialog
    - Fields: name (max 100), email (max 254), type (select), roles (comma-separated, max 500)
    - Submit disabled until name non-empty + email valid + type selected
    - On success: navigate to `/team/:id`
    - 422 duplicate email → inline error on email field
    - Other errors → error message in dialog, re-enable submit
    - Close on backdrop/escape without sending request
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 5. Team Detail Page
  - [x] 5.1 Create `src/pages/TeamDetailPage.tsx` with view/edit form
    - Editable fields: name (max 200), email (validated), phone (max 30), roles, notes (max 2000)
    - Read-only fields: type, specializations, languages, extraction_status, created_at, updated_at
    - Save button sends PUT with modified fields, shows toast on success
    - Loading skeleton while fetching
    - 404 → not-found message + link to `/team`
    - 409 on save → inline error on email
    - Name empty on save → inline validation error, prevent request
    - Other save errors → toast error, re-enable Save
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [x] 5.2 Add CV upload zone to TeamDetailPage
    - Accepts PDF/DOCX, max 10MB
    - Client-side validation: reject wrong MIME/size without request
    - Upload via `useUploadCv` mutation
    - Loading indicator + disabled control during upload
    - Error display on failure or 60s timeout
    - Show existing CV filename when `cv_s3_key` is not null
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 5.3 Add delete confirmation and re-extraction warning to TeamDetailPage
    - Delete button → confirmation dialog with member name + irreversibility warning
    - Confirm → DELETE request → navigate to `/team`
    - Delete failure → error message, re-enable confirm
    - Re-extraction info banner: visible when `cv_s3_key !== null` AND notes differ from saved value
    - Banner hidden when notes reverted to saved value or no CV exists
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 10.1, 10.2, 10.3, 10.4_

- [x] 6. Routing and navigation
  - [x] 6.1 Register `/team` and `/team/:id` routes in `src/App.tsx` and add "Team" nav link to `src/layouts/AppLayout.tsx`
    - Add routes inside the AppLayout route group
    - Nav link positioned after "Runs", before "Settings"
    - Active state styling matches existing links
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 7. Checkpoint - Verify full UI
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Property-based tests
  - [x] 8.1 Write property test: API client error handling consistency
    - **Property 1: API client error handling consistency**
    - Generate random status codes (400–599) and random response bodies (JSON with detail, JSON without detail, non-JSON)
    - Assert `apiPost`, `apiDelete`, `apiUpload` throw `ApiError` with correct `statusCode` and `detail`
    - **Validates: Requirements 1.4**

  - [x] 8.2 Write property test: Pagination termination
    - **Property 2: Pagination termination**
    - Generate random `page` (1–1000) and `total_pages` (1–1000 or null)
    - Assert `getNextPageParam` returns `page + 1` when `total_pages !== null && page < total_pages`, else `undefined`
    - **Validates: Requirements 3.1**

  - [x] 8.3 Write property test: Client-side CV file validation
    - **Property 3: Client-side CV file validation**
    - Generate random sizes (0–20MB) and random MIME strings
    - Assert validation accepts iff size ≤ 10,485,760 AND MIME is `application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
    - **Validates: Requirements 7.4**

  - [x] 8.4 Write property test: Re-extraction warning visibility predicate
    - **Property 4: Re-extraction warning visibility predicate**
    - Generate random `cv_s3_key` (null or string) and random notes pairs (current vs saved)
    - Assert warning visible iff `cv_s3_key !== null` AND `currentNotes !== savedNotes`
    - **Validates: Requirements 10.1, 10.2, 10.3**

  - [x] 8.5 Write property test: Create form validation gate
    - **Property 5: Create form validation gate**
    - Generate random name, email, type selection
    - Assert submit enabled iff `name.trim() !== ''` AND email matches `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` AND type selected
    - **Validates: Requirements 5.2**

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The implementation language is TypeScript throughout, matching the existing codebase
- All hooks use TanStack Query — no direct `apiFetch` calls from components
- shadcn/ui components for all UI primitives (buttons, badges, tables, dialogs, selects)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["4.1", "5.1", "6.1"] },
    { "id": 4, "tasks": ["4.2", "5.2"] },
    { "id": 5, "tasks": ["5.3"] },
    { "id": 6, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5"] }
  ]
}
```
