# Requirements Document

## Introduction

References Management provides a UI for Green Partners to manage their portfolio of past projects/references within the GPTenders web app. This enables the analyzer to match references against tender reference requirements. The feature introduces a `/references` list page and `/references/:id` detail page with full CRUD operations, multi-document upload with LLM extraction, expert linking to team members, extraction status display, and manual re-extraction trigger. Structurally mirrors the existing Team Management feature.

## Glossary

- **References_Management_System**: The set of UI pages, API client functions, hooks, and routing that constitute the references management feature in the web app
- **Reference_List_Page**: The page at `/references` displaying a paginated, filterable list of references with a create action
- **Reference_Detail_Page**: The page at `/references/:id` displaying full reference details with inline editing, document management, expert linking, extracted fields display, and re-extraction controls
- **Create_Dialog**: A modal dialog triggered from the list page to create a new reference with minimal required fields
- **API_Client**: The fetch wrapper layer in `src/api/client.ts` responsible for making HTTP requests to the backend
- **Extraction_Status**: A backend-assigned enum (`pending`, `processing`, `completed`, `failed`) indicating LLM document processing state
- **Reference**: A past project in the Green Partners portfolio, identified by UUID, containing metadata, linked experts, uploaded documents, and LLM-extracted fields
- **Enriched_Expert**: A team member linked to a reference, returned by the API with `id`, `name`, and `roles` fields pre-resolved from the UUID
- **Extracted_Fields**: A freeform object containing LLM-extracted data from reference documents (themes, donor, countries, type, key_deliverables, budget_range)
- **Document_Info**: Metadata for an uploaded document associated with a reference, containing filename and a presigned download URL

## Requirements

### Requirement 1: Reference Types and Endpoint Functions

**User Story:** As a developer, I want TypeScript types and endpoint functions for references, so that the UI layer can interact with the references API in a type-safe manner.

#### Acceptance Criteria

1. THE References_Management_System SHALL define a `ReferenceExtractionStatus` type as a union of literal strings: `"pending"`, `"processing"`, `"completed"`, `"failed"`
2. THE References_Management_System SHALL define a `ReferenceListItem` type with fields: `id` (string), `title` (string), `client` (string or null), `sector` (string or null), `year` (number or null), `budget_eur` (number or null), `extraction_status` (ReferenceExtractionStatus or null)
3. THE References_Management_System SHALL define a `ReferenceResponse` type extending `ReferenceListItem` with additional fields: `region` (string or null), `description` (string or null), `experts_involved` (string array of UUIDs), `enriched_experts` (EnrichedExpert array), `consortium_partners` (string array), `documents` (string array of S3 keys), `document_urls` (DocumentInfo array), `knowledge_s3_key` (string or null), `extracted_fields` (ExtractedFields or null), `slug` (string), `created_at` (string), `updated_at` (string)
4. THE References_Management_System SHALL define an `EnrichedExpert` type with fields: `id` (string), `name` (string), `roles` (string array)
5. THE References_Management_System SHALL define a `DocumentInfo` type with fields: `filename` (string), `presigned_url` (string)
6. THE References_Management_System SHALL define an `ExtractedFields` type as a partial object where all fields are optional: `themes` (string array), `donor` (string), `countries` (string array), `type` (string), `key_deliverables` (string array), `budget_range` (string)
7. THE References_Management_System SHALL define a `ReferenceCreate` type with fields: `title` (required string), `client` (optional string), `sector` (optional string), `region` (optional string), `year` (optional number), `budget_eur` (optional number), `description` (optional string), `experts_involved` (optional string array of UUIDs, maximum 50 items), `consortium_partners` (optional string array)
8. THE References_Management_System SHALL define a `ReferenceUpdate` type with all fields optional: `title` (string), `client` (string), `sector` (string), `region` (string), `year` (number), `budget_eur` (number), `description` (string), `experts_involved` (string array of UUIDs, maximum 50 items), `consortium_partners` (string array)
9. THE References_Management_System SHALL define a `ReferenceListParams` type with optional fields: `page` (string), `page_size` (string), `search` (string for text search against title and client, maximum 200 characters), `sector` (string), `year` (string)
10. WHEN `getReferences` is called with `ReferenceListParams`, THE References_Management_System SHALL send a GET request to `/references` with the params as query string parameters and return `Promise<PaginatedResponse<ReferenceListItem>>`
11. WHEN `getReference` is called with a reference `id` (string), THE References_Management_System SHALL send a GET request to `/references/{id}` and return `Promise<ReferenceResponse>`
12. WHEN `createReference` is called with a `ReferenceCreate` body, THE References_Management_System SHALL send a POST request to `/references` with the body as JSON and return `Promise<ReferenceResponse>`
13. WHEN `updateReference` is called with a reference `id` (string) and a `ReferenceUpdate` body, THE References_Management_System SHALL send a PUT request to `/references/{id}` with the body as JSON and return `Promise<ReferenceResponse>`
14. WHEN `deleteReference` is called with a reference `id` (string), THE References_Management_System SHALL send a DELETE request to `/references/{id}` and return `Promise<void>`
15. WHEN `uploadReferenceDocument` is called with a reference `id` (string) and a `File` object, THE References_Management_System SHALL send a POST request to `/references/{id}/document` with the file as multipart/form-data (field name: `file`) and return `Promise<ReferenceResponse>`
16. WHEN `deleteReferenceDocument` is called with a reference `id` (string) and a `filename` (string), THE References_Management_System SHALL send a DELETE request to `/references/{id}/document/{filename}` and return `Promise<void>`
17. WHEN `extractReference` is called with a reference `id` (string), THE References_Management_System SHALL send a POST request to `/references/{id}/extract` with no body and return `Promise<ReferenceResponse>`
18. IF any endpoint function receives an HTTP error response (status >= 400), THEN THE References_Management_System SHALL throw an `ApiError` with the `detail` string and status code extracted from the response body, consistent with the existing `apiFetch`/`apiPost`/`apiPut`/`apiDelete`/`apiUpload` error handling pattern

### Requirement 2: Reference Data Hooks

**User Story:** As a developer, I want TanStack Query hooks for reference data operations, so that components can fetch, create, update, and delete references using the established data-fetching pattern.

#### Acceptance Criteria

1. THE References_Management_System SHALL provide a `useReferenceList` hook using `useInfiniteQuery` with `queryKey: ['references', { search, sector, year }]`, `initialPageParam: 1`, a `queryFn` that passes `{ page: String(pageParam), search, sector, year }` to the `getReferences` endpoint function, and `getNextPageParam` that returns `lastPage.page + 1` when `lastPage.total_pages` is not null and `lastPage.page < lastPage.total_pages`, and `undefined` otherwise
2. THE References_Management_System SHALL provide a `useReferenceDetail` hook using `useQuery` with `queryKey: ['reference', id]` that calls the `getReference` endpoint function, and sets `enabled: !!id` so the query does not execute when `id` is `undefined` or an empty string
3. THE References_Management_System SHALL provide a `useCreateReference` mutation hook that accepts a `ReferenceCreate` body as its `mutationFn` input, calls the `createReference` endpoint function, and whose `onSuccess` handler calls `invalidateQueries({ queryKey: ['references'] })`
4. THE References_Management_System SHALL provide a `useUpdateReference` mutation hook that accepts `{ id: string; body: ReferenceUpdate }` as its `mutationFn` input, calls the `updateReference` endpoint function with the ID and body, and whose `onSuccess` handler calls `invalidateQueries` on both `['references']` and `['reference', variables.id]`
5. THE References_Management_System SHALL provide a `useDeleteReference` mutation hook that accepts a reference ID string as its `mutationFn` input, calls the `deleteReference` endpoint function, and whose `onSuccess` handler calls `invalidateQueries({ queryKey: ['references'] })`
6. THE References_Management_System SHALL provide a `useUploadDocument` mutation hook that accepts `{ id: string; file: File }` as its `mutationFn` input, calls the `uploadReferenceDocument` endpoint function with the reference ID and file, and whose `onSuccess` handler calls `invalidateQueries({ queryKey: ['reference', variables.id] })`
7. THE References_Management_System SHALL provide a `useDeleteDocument` mutation hook that accepts `{ id: string; filename: string }` as its `mutationFn` input, calls the `deleteReferenceDocument` endpoint function with the reference ID and filename, and whose `onSuccess` handler calls `invalidateQueries({ queryKey: ['reference', variables.id] })`
8. THE References_Management_System SHALL provide a `useExtractReference` mutation hook that accepts a reference ID string as its `mutationFn` input, calls the `extractReference` endpoint function, and whose `onSuccess` handler calls `invalidateQueries({ queryKey: ['reference', id] })`
9. THE References_Management_System SHALL export all hooks from a single file at `src/hooks/useReferences.ts`, each importing endpoint functions from `src/api/endpoints` and never calling `apiFetch` directly

### Requirement 3: Document Validation Utility

**User Story:** As a developer, I want a reusable document validation utility, so that file type and size constraints are enforced consistently across reference document uploads.

#### Acceptance Criteria

1. THE References_Management_System SHALL provide a `validateDocument` function at `src/utils/document-validation.ts` that accepts a `File` object and returns `null` when the file is valid, or a non-empty error message string when the file is invalid
2. WHEN the file MIME type is not one of `application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, THE `validateDocument` function SHALL return a non-empty string indicating that only PDF and DOCX files are accepted
3. WHEN the file size exceeds 10,485,760 bytes (10MB), THE `validateDocument` function SHALL return a non-empty string indicating the file exceeds the maximum allowed size
4. WHEN both MIME type and file size are invalid, THE `validateDocument` function SHALL return the size error (size is checked first)
5. WHEN the file has an accepted MIME type and size is between 0 and 10,485,760 bytes inclusive, THE `validateDocument` function SHALL return `null`
6. FOR ALL valid File objects with accepted MIME types and size within limits, validating then re-validating the same file SHALL produce the same `null` result (idempotence property)

### Requirement 4: Reference List Page

**User Story:** As a Green Partners user, I want to see all references in a paginated list with search, sector, and year filtering, so that I can quickly find and manage past project references.

#### Acceptance Criteria

1. WHEN the user navigates to `/references`, THE Reference_List_Page SHALL display a list of references showing title, client, sector, region, year, budget (formatted as "€X,XXX" for non-null values, or a dash "—" for null values), and extraction status for each reference
2. THE Reference_List_Page SHALL display extraction_status as a colored badge: yellow for `pending`, green for `completed`, red for `failed`; references with null extraction_status SHALL not display a badge
3. WHEN the user types in the search field and at least 300ms have elapsed since the last keystroke, THE Reference_List_Page SHALL filter the list by title using the API `search` query parameter, limited to a maximum of 200 characters
4. WHEN the user enters a value in the sector filter field, THE Reference_List_Page SHALL filter the list using the API `sector` query parameter
5. WHEN the user enters a value in the year filter field, THE Reference_List_Page SHALL filter the list using the API `year` query parameter with an integer value between 1990 and 2030
6. WHEN the API response contains `total_pages` greater than the current `page`, THE Reference_List_Page SHALL display a "Load more" button that fetches the next page (incrementing the `page` parameter by 1 with a `page_size` of 20) and appends results to the existing list
7. WHEN the user clicks a reference row, THE Reference_List_Page SHALL navigate to `/references/:id` for that reference
8. WHEN the API returns an empty result set (`items` is an empty array) and no filters or search are active, THE Reference_List_Page SHALL display an empty state message indicating no references have been added
9. WHEN the API returns an empty result set (`items` is an empty array) and a search or filter is active, THE Reference_List_Page SHALL display a message indicating no references match the current criteria
10. IF the API request fails, THEN THE Reference_List_Page SHALL display an error message indicating the list could not be loaded and SHALL provide a retry action that re-executes the failed query
11. WHILE the API request is in progress (initial load or filter change), THE Reference_List_Page SHALL display a loading indicator in place of the list content
12. WHEN the user changes any filter or search value, THE Reference_List_Page SHALL reset pagination to page 1 and replace the current list with the new result set

### Requirement 5: Create Reference Dialog

**User Story:** As a Green Partners user, I want to create new references from the list page using a dialog, so that I can quickly add past projects without leaving the list context.

#### Acceptance Criteria

1. WHEN the user clicks the "Add Reference" button on the Reference_List_Page, THE Create_Dialog SHALL open with fields for title (text input, required, max 200 characters), client (text input, optional, max 200 characters), sector (text input, optional, max 100 characters), region (text input, optional, max 100 characters), year (number input, optional, range 1990-2030), and budget_eur (number input, optional, range 0 to 999,999,999.99)
2. THE Create_Dialog SHALL prevent text entry beyond the maximum character limit for each text field (title: 200, client: 200, sector: 100, region: 100) by stopping input at the limit
3. THE Create_Dialog SHALL disable the submit button until the title field contains at least 1 non-whitespace character
4. IF the user enters a year value outside the range 1990-2030, THEN THE Create_Dialog SHALL display an inline validation error on the year field and keep the submit button disabled
5. IF the user enters a budget_eur value less than 0 or greater than 999,999,999.99, THEN THE Create_Dialog SHALL display an inline validation error on the budget field and keep the submit button disabled
6. WHEN the user submits the Create_Dialog with valid data, THE References_Management_System SHALL disable the submit button to prevent duplicate submissions, send a POST request to create the reference, and navigate to the new reference's detail page on success
7. IF the API returns an error during reference creation, THEN THE Create_Dialog SHALL display the error message from the API response (or a generic connectivity message if no response body is available), re-enable the submit button, and preserve all entered form data
8. WHEN the user clicks outside the Create_Dialog or activates the close control, THE Create_Dialog SHALL close without sending any API request and discard entered data without a confirmation prompt

### Requirement 6: Reference Detail Page — View and Edit

**User Story:** As a Green Partners user, I want to view and edit a reference's full details on a dedicated page, so that I can manage project metadata, description, and consortium partners.

#### Acceptance Criteria

1. WHEN the user navigates to `/references/:id`, THE Reference_Detail_Page SHALL display all reference fields: title, client, sector, region, year, budget_eur, description, consortium_partners, extraction status, and timestamps (created_at, updated_at)
2. THE Reference_Detail_Page SHALL render editable fields (title, client, sector, region, year, budget_eur, description, consortium_partners) as form inputs in an always-editable state, with the following character limits: title max 200, client max 200, sector max 100, region max 100, description max 5000, and consortium_partners as a comma-separated text input with max 1000 characters total
3. THE Reference_Detail_Page SHALL validate year within range 1990–2030, budget_eur as a non-negative number with up to 2 decimal places and a maximum value of 999,999,999.99, and title as non-empty (trimmed) before allowing save
4. WHEN the user clicks the "Save" button, THE Reference_Detail_Page SHALL disable the Save button, send a PUT request with all modified fields, and upon success display a success toast notification that auto-dismisses after 3 seconds, then re-enable the Save button
5. WHILE the reference data is loading from the API, THE Reference_Detail_Page SHALL display a loading skeleton placeholder in place of the form content
6. IF the API returns a 404 for the reference ID, THEN THE Reference_Detail_Page SHALL display a "not found" message with a link back to the references list
7. IF the save request fails, THEN THE Reference_Detail_Page SHALL display a toast error message indicating the save failed that auto-dismisses after 5 seconds, and re-enable the Save button without clearing the form
8. IF the title field is empty or contains only whitespace when the user clicks Save, THEN THE Reference_Detail_Page SHALL display an inline validation error on the title field and prevent the request from being sent
9. WHEN the user modifies the description field, THE Reference_Detail_Page SHALL display an info banner below the description field indicating that saving will trigger re-extraction of reference data
10. IF the Save button is clicked and no fields have been modified since the last successful load or save, THEN THE Reference_Detail_Page SHALL not send a PUT request and the Save button SHALL remain in its current state

### Requirement 7: Expert Linking

**User Story:** As a Green Partners user, I want to link team members as experts on a reference, so that the analyzer can match expert experience against tender requirements.

#### Acceptance Criteria

1. THE Reference_Detail_Page SHALL display a searchable multi-select control for linking experts to the reference, showing currently linked experts (from `enriched_experts` in the API response) as removable chips displaying each expert's name and roles
2. WHEN the user types at least 1 character in the expert search field and at least 300ms have elapsed since the last keystroke, THE Reference_Detail_Page SHALL fetch team members from `GET /team?search={query}&page_size=20` and display matching results as selectable options showing name and roles, excluding any team members already present in the `experts_involved` array
3. IF the search request returns zero matching team members, THEN THE Reference_Detail_Page SHALL display an empty-state message within the dropdown indicating no team members were found
4. WHEN the user selects a team member from the search results, THE Reference_Detail_Page SHALL add that member's UUID to the `experts_involved` array and display the member as a removable chip showing name and roles
5. WHEN the user removes an expert chip, THE Reference_Detail_Page SHALL remove that member's UUID from the `experts_involved` array
6. WHILE 50 experts are linked in the `experts_involved` array, THE Reference_Detail_Page SHALL disable the search control and display a message indicating the maximum of 50 experts has been reached
7. WHEN the user saves the reference, THE `experts_involved` field SHALL be included in the PUT request body as an array of team member UUIDs

### Requirement 8: Document Management

**User Story:** As a Green Partners user, I want to upload, download, and delete documents for a reference, so that the system can extract relevant information via LLM.

#### Acceptance Criteria

1. THE Reference_Detail_Page SHALL display a document upload control that accepts PDF and DOCX files up to 10MB (10,485,760 bytes), validated by MIME type (`application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`)
2. THE Reference_Detail_Page SHALL display a list of existing documents (from `document_urls` in the API response) showing filename and a download link for each, or an empty state message when no documents are present
3. WHEN the user clicks a document download link, THE Reference_Detail_Page SHALL open the presigned URL in a new browser tab
4. WHEN the user selects a file for upload, THE Reference_Detail_Page SHALL validate the file using the `validateDocument` utility and, if valid, upload it via multipart POST to `/references/:id/documents`
5. WHEN the document upload completes successfully, THE Reference_Detail_Page SHALL invalidate the reference query to refresh the document list and SHALL display the updated `extraction_status` badge (pending=yellow, completed=green, failed=red)
6. IF the selected file fails validation, THEN THE Reference_Detail_Page SHALL display an inline error message stating the reason (file size exceeded or unsupported file type) and SHALL NOT initiate the upload request
7. WHILE the upload is in progress, THE Reference_Detail_Page SHALL display a loading indicator on the upload control and SHALL disable the upload control to prevent duplicate submissions
8. WHEN the user clicks the delete action on a document, THE Reference_Detail_Page SHALL display a confirmation dialog stating that deletion is irreversible and will remove the file, and upon confirmation, send a DELETE request to `/references/:id/documents/:filename`
9. WHEN a document delete completes successfully, THE Reference_Detail_Page SHALL invalidate the reference query to refresh the document list and SHALL display the updated `extraction_status` badge
10. IF a document upload or delete request fails, THEN THE Reference_Detail_Page SHALL display a toast or inline error message indicating the operation that failed (upload or delete) and the affected filename

### Requirement 9: Extracted Fields Display

**User Story:** As a Green Partners user, I want to see LLM-extracted information from reference documents rendered semantically, so that I can quickly understand what the system has learned from uploaded documents.

#### Acceptance Criteria

1. IF `extracted_fields` is not null and contains at least one non-empty known field, THEN THE Reference_Detail_Page SHALL display the extracted fields in a labeled read-only section with a heading identifying it as extracted data
2. WHEN `extracted_fields.themes` is present and non-empty, THE Reference_Detail_Page SHALL render each theme as a Badge component
3. WHEN `extracted_fields.donor` is present and non-empty, THE Reference_Detail_Page SHALL render the donor as plain text
4. WHEN `extracted_fields.countries` is present and non-empty, THE Reference_Detail_Page SHALL render countries as a comma-separated text list
5. WHEN `extracted_fields.type` is present and non-empty, THE Reference_Detail_Page SHALL render the project type as plain text
6. WHEN `extracted_fields.key_deliverables` is present and non-empty, THE Reference_Detail_Page SHALL render key deliverables as a bulleted list with one item per deliverable
7. WHEN `extracted_fields.budget_range` is present and non-empty, THE Reference_Detail_Page SHALL render the budget range as plain text
8. IF `extracted_fields` is null, or all known fields within it are absent or empty, THEN THE Reference_Detail_Page SHALL display a message indicating no extracted data is available
9. THE Reference_Detail_Page SHALL ignore unknown fields in `extracted_fields` (fields not in the set: themes, donor, countries, type, key_deliverables, budget_range) without rendering them or producing errors
10. WHEN a known field is present but contains an empty value (empty string, empty array, or null), THE Reference_Detail_Page SHALL omit that field from the rendered section rather than displaying an empty element

### Requirement 10: Re-Extraction

**User Story:** As a Green Partners user, I want to manually trigger re-extraction and be warned when changes will cause it, so that I understand when the system will reprocess documents.

#### Acceptance Criteria

1. IF at least one document exists for the reference, THEN THE Reference_Detail_Page SHALL display a "Re-extract" button
2. WHEN the user clicks the "Re-extract" button, THE Reference_Detail_Page SHALL send a POST request to `/references/:id/extract`, disable the button with a loading indicator for the duration of the request, and update the displayed extraction status badge to reflect the status returned in the response
3. WHILE the reference has at least one document AND the current description field value differs from the last-saved description value, THE Reference_Detail_Page SHALL display an informational banner above the form actions indicating that saving will trigger re-extraction of documents
4. IF the reference does not have any documents, THEN THE Reference_Detail_Page SHALL NOT display the re-extraction warning regardless of description field modifications
5. WHEN the user reverts the description field content to match the last-saved value, THE Reference_Detail_Page SHALL hide the re-extraction warning within the same render cycle
6. IF the re-extraction request fails, THEN THE Reference_Detail_Page SHALL re-enable the "Re-extract" button and display a toast error message indicating re-extraction could not be started
7. WHILE the extraction status of the reference is "pending", THE Reference_Detail_Page SHALL display the "Re-extract" button in a disabled state

### Requirement 11: Delete Reference

**User Story:** As a Green Partners user, I want to delete a reference with a confirmation step, so that I can remove past projects without accidental data loss.

#### Acceptance Criteria

1. WHEN the user clicks the "Delete" button on the Reference_Detail_Page, THE References_Management_System SHALL display a modal confirmation dialog that includes the reference title, states that deletion is irreversible and will remove all associated documents from storage, and provides both a confirm and a cancel action
2. WHEN the user confirms deletion, THE References_Management_System SHALL disable the confirm button, send a DELETE request to the API, invalidate the references list query cache, and navigate to `/references` on a successful (2xx) response
3. IF the delete request fails due to a non-2xx response or network error, THEN THE References_Management_System SHALL display an error message indicating the reference could not be deleted, re-enable the confirm button, and keep the user on the detail page with the dialog dismissed
4. WHEN the user clicks cancel or dismisses the confirmation dialog, THE References_Management_System SHALL close the dialog and take no further action
5. WHEN the user navigates to `/references` after a successful deletion, THE References_Management_System SHALL display a success toast confirming the reference was deleted

### Requirement 12: Routing and Navigation

**User Story:** As a user, I want to access references management through the app navigation and URL routing, so that the feature is discoverable and bookmarkable.

#### Acceptance Criteria

1. THE References_Management_System SHALL register a `references` route that renders the Reference_List_Page and a `references/:id` route that renders the Reference_Detail_Page, both nested inside the AppLayout route in the application router
2. THE References_Management_System SHALL add a "References" NavLink targeting `/references` in the navigation bar, positioned between the "Team" link and the "Settings" link, using the same `NavLink` className pattern (text-primary when active, text-muted-foreground when inactive) as existing navigation links
3. IF the user navigates to `/references/:id` and the API returns a not-found error for that ID, THEN THE Reference_Detail_Page SHALL display a not-found message indicating the reference does not exist, and a link that navigates back to `/references`
4. WHEN the user navigates to any path starting with `/references`, THE navigation bar SHALL indicate the "References" link as active by applying the active-state class, including on child routes such as `/references/:id`
