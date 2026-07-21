# Design Document: References Management

## Overview

References Management adds a two-page CRUD feature (`/references` list + `/references/:id` detail) for managing Green Partners' portfolio of past projects. The feature mirrors the existing Team Management pattern structurally — paginated list with filters, detail page with inline editing, document upload with LLM extraction, and a deletion flow with confirmation.

Key capabilities:
- Paginated, filterable list of references with search, sector, and year filters
- Create dialog from list page with auto-navigation to detail
- Detail page with editable metadata, multi-document upload, expert linking (to team members), extracted fields display, and manual re-extraction trigger
- Document validation utility shared with Team CV upload
- Colored extraction status badges (pending/completed/failed)

## Architecture

```mermaid
graph TD
    subgraph Routing
        A[App.tsx] --> B[/references → ReferenceListPage]
        A --> C[/references/:id → ReferenceDetailPage]
    end

    subgraph Data Layer
        D[src/api/types.ts] --> E[src/api/endpoints.ts]
        E --> F[src/hooks/useReferences.ts]
    end

    subgraph Pages
        B --> F
        C --> F
        C --> G[src/hooks/useTeam.ts - team search]
    end

    subgraph Utilities
        H[src/utils/document-validation.ts]
        I[src/utils/re-extraction-warning.ts]
    end

    C --> H
    C --> I
```

**Data flow**: Components → Hooks (TanStack Query) → Endpoint functions → `apiFetch`/`apiPost`/`apiPut`/`apiDelete`/`apiUpload` → Backend API

State management: TanStack Query for server state, local `useState` for form/UI state. No global store.

## Components and Interfaces

### Page Components

| Component | Path | Route |
|-----------|------|-------|
| `ReferenceListPage` | `src/pages/ReferenceListPage.tsx` | `/references` |
| `ReferenceDetailPage` | `src/pages/ReferenceDetailPage.tsx` | `/references/:id` |

### Component Tree — List Page

```
ReferenceListPage
├── Header (title + "Add Reference" button)
├── Filters (search input, sector input, year input)
├── CreateReferenceDialog
│   └── Form (title*, client, sector, region, year, budget_eur)
├── ReferenceTable / EmptyState / LoadingSpinner / ErrorAlert
└── "Load more" Button (when hasNextPage)
```

### Component Tree — Detail Page

```
ReferenceDetailPage
├── Header (reference title + "← Back to references" link)
├── ReferenceForm (inline, always-editable)
│   ├── Metadata fields (title*, client, sector, region, year, budget_eur)
│   ├── Description textarea + re-extraction warning banner
│   ├── Consortium partners (comma-separated text input)
│   └── Save button
├── ExpertLinking section
│   ├── Linked experts (removable chips: name + roles)
│   ├── Search input (debounced, fetches /team?search=...)
│   └── Dropdown results (selectable, excludes already-linked)
├── DocumentManagement section
│   ├── Upload button (validates via validateDocument)
│   ├── Document list (filename + download link + delete action)
│   └── Delete confirmation dialog
├── ExtractedFieldsDisplay section (read-only)
│   ├── themes → Badge components
│   ├── donor, type, budget_range → plain text
│   ├── countries → comma-separated text
│   └── key_deliverables → bulleted list
├── Read-only metadata (extraction_status badge, created_at, updated_at)
├── Re-extract button (when documents exist)
└── Delete reference button + confirmation dialog
```

## Data Models

### TypeScript Types (added to `src/api/types.ts`)

```typescript
// === References ===

export type ReferenceExtractionStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface EnrichedExpert {
  id: string
  name: string
  roles: string[]
}

export interface DocumentInfo {
  filename: string
  presigned_url: string
}

export interface ExtractedFields {
  themes?: string[]
  donor?: string
  countries?: string[]
  type?: string
  key_deliverables?: string[]
  budget_range?: string
}

export interface ReferenceListItem {
  id: string
  title: string
  client: string | null
  sector: string | null
  year: number | null
  budget_eur: number | null
  extraction_status: ReferenceExtractionStatus | null
}

export interface ReferenceResponse extends ReferenceListItem {
  region: string | null
  description: string | null
  experts_involved: string[]
  enriched_experts: EnrichedExpert[]
  consortium_partners: string[]
  documents: string[]
  document_urls: DocumentInfo[]
  knowledge_s3_key: string | null
  extracted_fields: ExtractedFields | null
  slug: string
  created_at: string
  updated_at: string
}

export interface ReferenceCreate {
  title: string
  client?: string
  sector?: string
  region?: string
  year?: number
  budget_eur?: number
  description?: string
  experts_involved?: string[]
  consortium_partners?: string[]
}

export interface ReferenceUpdate {
  title?: string
  client?: string
  sector?: string
  region?: string
  year?: number
  budget_eur?: number
  description?: string
  experts_involved?: string[]
  consortium_partners?: string[]
}

export interface ReferenceListParams {
  page?: string
  page_size?: string
  search?: string
  sector?: string
  year?: string
}
```

### API Endpoint Functions (added to `src/api/endpoints.ts`)

```typescript
// === References ===

export function getReferences(
  params?: ReferenceListParams,
): Promise<PaginatedResponse<ReferenceListItem>> {
  return apiFetch<PaginatedResponse<ReferenceListItem>>(
    '/references',
    params ? { ...params } : undefined,
  )
}

export function getReference(id: string): Promise<ReferenceResponse> {
  return apiFetch<ReferenceResponse>(`/references/${id}`)
}

export function createReference(body: ReferenceCreate): Promise<ReferenceResponse> {
  return apiPost<ReferenceResponse>('/references', body)
}

export function updateReference(id: string, body: ReferenceUpdate): Promise<ReferenceResponse> {
  return apiPut<ReferenceResponse>(`/references/${id}`, body)
}

export function deleteReference(id: string): Promise<void> {
  return apiDelete(`/references/${id}`)
}

export function uploadReferenceDocument(id: string, file: File): Promise<ReferenceResponse> {
  const formData = new FormData()
  formData.append('file', file)
  return apiUpload<ReferenceResponse>(`/references/${id}/document`, formData)
}

export function deleteReferenceDocument(id: string, filename: string): Promise<void> {
  return apiDelete(`/references/${id}/document/${filename}`)
}

export function extractReference(id: string): Promise<ReferenceResponse> {
  return apiPost<ReferenceResponse>(`/references/${id}/extract`, {})
}
```

### TanStack Query Hooks (`src/hooks/useReferences.ts`)

```typescript
export function useReferenceList(search?: string, sector?: string, year?: string) {
  return useInfiniteQuery({
    queryKey: ['references', { search, sector, year }],
    queryFn: ({ pageParam }) =>
      getReferences({ page: String(pageParam), search, sector, year }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.total_pages !== null && lastPage.page < lastPage.total_pages
        ? lastPage.page + 1
        : undefined,
  })
}

export function useReferenceDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['reference', id],
    queryFn: () => getReference(id!),
    enabled: !!id,
  })
}

export function useCreateReference() { /* invalidates ['references'] */ }
export function useUpdateReference() { /* invalidates ['references'] + ['reference', id] */ }
export function useDeleteReference() { /* invalidates ['references'] */ }
export function useUploadDocument() { /* invalidates ['reference', id] */ }
export function useDeleteDocument() { /* invalidates ['reference', id] */ }
export function useExtractReference() { /* invalidates ['reference', id] */ }
```

### Document Validation Utility (`src/utils/document-validation.ts`)

```typescript
const MAX_DOCUMENT_SIZE = 10_485_760 // 10MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

export function validateDocument(file: File): string | null {
  if (file.size > MAX_DOCUMENT_SIZE) {
    return 'File exceeds 10MB limit'
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return 'Only PDF and DOCX files are accepted'
  }
  return null
}
```

Design decision: Size check runs first per requirement 3.4. The function signature mirrors `validateCvFile` exactly — both accept `File` and return `string | null`. The existing `cv-validation.ts` remains unchanged; references use the new shared utility.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Document validation size-first ordering

*For any* File object where both the MIME type is invalid and the size exceeds 10MB, `validateDocument` SHALL return the size error message, never the type error message.

**Validates: Requirements 3.4**

### Property 2: Document validation idempotence

*For any* valid File object (accepted MIME type and size ≤ 10MB), calling `validateDocument` once and calling it again on the same file SHALL both return `null`.

**Validates: Requirements 3.6**

### Property 3: Document validation accepts valid files

*For any* File object with MIME type in `['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']` and size between 0 and 10,485,760 bytes inclusive, `validateDocument` SHALL return `null`.

**Validates: Requirements 3.5**

### Property 4: Document validation rejects oversized files

*For any* File object with size > 10,485,760 bytes, regardless of MIME type, `validateDocument` SHALL return a non-empty string.

**Validates: Requirements 3.3**

### Property 5: Document validation rejects invalid MIME types

*For any* File object with size ≤ 10,485,760 bytes and MIME type NOT in the allowed set, `validateDocument` SHALL return a non-empty string indicating only PDF and DOCX are accepted.

**Validates: Requirements 3.2**

## Error Handling

| Scenario | Behavior |
|----------|----------|
| List page API failure | `<ErrorAlert>` with message + retry button |
| Detail page 404 | "Not found" message + link back to `/references` |
| Detail page other API error | `<ErrorAlert>` with message + retry button |
| Create dialog API error | Inline error message, form preserved, submit re-enabled |
| Save (PUT) failure | Toast error (auto-dismiss 5s), form preserved, Save re-enabled |
| Document upload failure | Toast/inline error with filename |
| Document delete failure | Toast/inline error with filename |
| Re-extract failure | Toast error, button re-enabled |
| Delete reference failure | Error in dialog, confirm button re-enabled, dialog dismissed |
| File validation failure | Inline error below upload control, no API call |

Error handling reuses existing patterns: `ApiError` class, `getErrorMessage()` utility, `<ErrorAlert>` component. Toast notifications use the same inline `Toast` component pattern from `TeamDetailPage`.

## Testing Strategy

### Unit Tests (Vitest + fast-check)

Property-based tests for `validateDocument`:
- Library: `fast-check` (already in devDependencies)
- Minimum 100 iterations per property
- Test file: `src/utils/document-validation.test.ts`
- Each test tagged: `Feature: references-management, Property N: <description>`

Properties tested:
1. Size-first error ordering
2. Idempotence of validation
3. Valid files always return null
4. Oversized files always return error string
5. Invalid MIME types always return error string

### Integration Tests (Vitest + msw)

Not in scope for this spec — hooks and endpoint functions are thin wrappers over existing `apiFetch`/`apiPost` infra that's already battle-tested.

### E2E Smoke Tests (Playwright)

Written at END of implementation. Cover critical paths:
- List page loads and shows references
- Create dialog → submit → navigates to detail
- Detail page edits → save → persists
- Document upload → extraction status updates
- Expert linking → save → enriched experts display
- Document delete → confirmation → removed from list
- Delete reference → confirmation → removed from list
- Re-extract button → extraction_status updates
