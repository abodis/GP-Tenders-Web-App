# Requirements Document

## Introduction

Team Management provides a UI for Green Partners to manage their team roster (employees and contractors) within the GPTenders web app. This enables the analyzer to match team members against tender requirements. The feature introduces a `/team` list page and `/team/:id` detail page with full CRUD operations, CV upload with LLM extraction, and extraction status display.

## Glossary

- **Team_Management_System**: The set of UI pages, API client functions, hooks, and routing that constitute the team management feature in the web app
- **Team_List_Page**: The page at `/team` displaying a paginated, filterable list of team members with a create action
- **Team_Detail_Page**: The page at `/team/:id` displaying full team member details with inline editing, CV upload, and delete capability
- **Create_Dialog**: A modal dialog triggered from the list page to create a new team member with minimal required fields
- **API_Client**: The fetch wrapper layer in `src/api/client.ts` responsible for making HTTP requests to the backend
- **Extraction_Status**: A backend-assigned enum (`pending`, `completed`, `failed`) indicating CV processing state
- **Team_Member**: A person (employee or contractor) in the Green Partners roster, identified by UUID

## Requirements

### Requirement 1: API Client Extensions

**User Story:** As a developer, I want POST, DELETE, and multipart upload helpers in the API client, so that team management CRUD operations and CV upload can be implemented using consistent patterns.

#### Acceptance Criteria

1. THE API_Client SHALL expose an `apiPost<T>(path: string, body: unknown): Promise<T>` function that sends a JSON POST request with the `x-api-key` header and `Content-Type: application/json`, and returns the parsed JSON response body typed as `T`
2. THE API_Client SHALL expose an `apiDelete(path: string): Promise<void>` function that sends a DELETE request with the `x-api-key` header and returns void without attempting to parse the response body
3. THE API_Client SHALL expose an `apiUpload<T>(path: string, body: FormData): Promise<T>` function that sends a POST request with the `x-api-key` header and the provided `FormData` body, and returns the parsed JSON response body typed as `T`
4. WHEN the server responds with a non-2xx status, THE API_Client SHALL attempt to parse the response body as JSON and throw an `ApiError` with the `detail` field and status code; IF the response body cannot be parsed as JSON, THEN THE API_Client SHALL throw an `ApiError` with the HTTP status text as the detail message
5. THE `apiUpload` function SHALL NOT set a `Content-Type` header, allowing the browser to set the multipart boundary automatically

### Requirement 2: Team Member Types and Endpoint Functions

**User Story:** As a developer, I want TypeScript types and endpoint functions for team members, so that the UI layer can interact with the team API in a type-safe manner.

#### Acceptance Criteria

1. THE Team_Management_System SHALL define a `TeamMemberListItem` type with fields: `id` (string), `name` (string), `email` (string), `type` (TeamMemberType enum), `roles` (string array), `extraction_status` (ExtractionStatus enum or null)
2. THE Team_Management_System SHALL define a `TeamMemberResponse` type extending `TeamMemberListItem` with additional fields: `phone` (string or null), `specializations` (string array), `languages` (string array), `notes` (string or null), `cv_s3_key` (string or null), `created_at` (string), `updated_at` (string)
3. THE Team_Management_System SHALL define a `TeamMemberType` union type with values `"employee"` and `"contractor"`
4. THE Team_Management_System SHALL define an `ExtractionStatus` union type with values `"pending"`, `"completed"`, and `"failed"`
5. THE Team_Management_System SHALL define a `TeamMemberCreate` type with fields: `name` (required string), `email` (required string), `type` (required TeamMemberType), `roles` (optional string array)
6. THE Team_Management_System SHALL define a `TeamMemberUpdate` type with all fields optional: `name` (string), `email` (string), `phone` (string), `roles` (string array), `notes` (string)
7. THE Team_Management_System SHALL define a `TeamListParams` type with optional fields: `page` (string), `page_size` (string), `type` (TeamMemberType), `q` (string for search)
8. THE Team_Management_System SHALL provide a `getTeamMembers` endpoint function that accepts `TeamListParams` and returns `Promise<PaginatedResponse<TeamMemberListItem>>`
9. THE Team_Management_System SHALL provide a `getTeamMember` endpoint function that accepts a member `id` (string) and returns `Promise<TeamMemberResponse>`
10. THE Team_Management_System SHALL provide a `createTeamMember` endpoint function that accepts a `TeamMemberCreate` body and returns `Promise<TeamMemberResponse>`
11. THE Team_Management_System SHALL provide an `updateTeamMember` endpoint function that accepts a member `id` (string) and a `TeamMemberUpdate` body and returns `Promise<TeamMemberResponse>`
12. THE Team_Management_System SHALL provide a `deleteTeamMember` endpoint function that accepts a member `id` (string) and returns `Promise<void>`
13. THE Team_Management_System SHALL provide an `uploadTeamMemberCv` endpoint function that accepts a member `id` (string) and a `File` object, sends it as multipart/form-data, and returns `Promise<TeamMemberResponse>`

### Requirement 3: Team Data Hooks

**User Story:** As a developer, I want TanStack Query hooks for team data operations, so that components can fetch, create, update, and delete team members using the established data-fetching pattern.

#### Acceptance Criteria

1. THE Team_Management_System SHALL provide a `useTeamList` hook using `useInfiniteQuery` with `queryKey: ['team-members', { type, search }]`, `initialPageParam: 1`, and `getNextPageParam` that returns `lastPage.page + 1` when `lastPage.page < lastPage.total_pages`, and `undefined` otherwise
2. THE Team_Management_System SHALL provide a `useTeamDetail` hook using `useQuery` with `queryKey: ['team-member', id]` that fetches a single team member by ID, and does not execute the query when `id` is `undefined` or an empty string
3. THE Team_Management_System SHALL provide a `useCreateMember` mutation hook whose `mutationFn` calls the create endpoint and whose `onSuccess` handler calls `invalidateQueries({ queryKey: ['team-members'] })`
4. THE Team_Management_System SHALL provide a `useUpdateMember` mutation hook whose `mutationFn` calls the update endpoint with both the member ID and updated fields, and whose `onSuccess` handler calls `invalidateQueries` on both `['team-members']` and `['team-member', id]`
5. THE Team_Management_System SHALL provide a `useDeleteMember` mutation hook whose `mutationFn` calls the delete endpoint and whose `onSuccess` handler calls `invalidateQueries({ queryKey: ['team-members'] })`
6. THE Team_Management_System SHALL provide a `useUploadCv` mutation hook whose `mutationFn` calls the CV upload endpoint with `multipart/form-data` and whose `onSuccess` handler calls `invalidateQueries({ queryKey: ['team-member', id] })` for the member whose CV was uploaded
7. IF the `useCreateMember` mutation receives a 422 response from the API, THEN THE Team_Management_System SHALL surface the error through TanStack Query's `isError` / `error` state without invalidating the team list query
8. THE Team_Management_System SHALL export all six hooks from a single file at `src/hooks/useTeam.ts`, each importing endpoint functions from `src/api/endpoints` and never calling `apiFetch` directly

### Requirement 4: Team List Page

**User Story:** As a Green Partners user, I want to see all team members in a paginated list with search and type filtering, so that I can quickly find and manage roster members.

#### Acceptance Criteria

1. WHEN the user navigates to `/team`, THE Team_List_Page SHALL display a list of team members showing name, email (or a dash if null), type, roles (as tags), and extraction status for each member
2. THE Team_List_Page SHALL display extraction_status as a colored badge: yellow for `pending`, green for `completed`, red for `failed`
3. WHEN the user types in the search field and at least 300ms have elapsed since the last keystroke, THE Team_List_Page SHALL filter the list by name or email using the API `search` query parameter
4. WHEN the user selects a type filter, THE Team_List_Page SHALL filter the list to show only members of the selected type (`employee` or `contractor`) using the API `type` query parameter, and SHALL provide an option to clear the filter and show all types
5. WHEN the API response contains `total_pages` greater than the current `page`, THE Team_List_Page SHALL display a "Load more" button that fetches the next page and appends results to the existing list
6. WHEN the user clicks a team member row, THE Team_List_Page SHALL navigate to `/team/:id` for that member
7. WHEN the API returns an empty result set and no filters or search are active, THE Team_List_Page SHALL display an empty state message indicating no members have been added
8. WHEN the API returns an empty result set and a search or filter is active, THE Team_List_Page SHALL display a message indicating no members match the current criteria
9. IF the API request fails, THEN THE Team_List_Page SHALL display an error message indicating the list could not be loaded and SHALL provide a retry action

### Requirement 5: Create Team Member Dialog

**User Story:** As a Green Partners user, I want to create new team members from the list page using a simple dialog, so that I can quickly add people without leaving the list context.

#### Acceptance Criteria

1. WHEN the user clicks the "Add Member" button on the Team_List_Page, THE Create_Dialog SHALL open with fields for name (text input, max 100 characters), email (text input, max 254 characters), type (select with options "employee" and "contractor"), and roles (comma-separated text input, max 500 characters)
2. THE Create_Dialog SHALL disable the submit button until name is non-empty, email matches a standard email format, and type has a selected value
3. WHEN the user submits the Create_Dialog with valid data, THE Team_Management_System SHALL disable the submit button to prevent duplicate submissions, send a POST request to create the member, and navigate to the new member's detail page on success
4. IF the API returns a 422 error for duplicate email, THEN THE Create_Dialog SHALL display an inline error message below the email field indicating the email is already in use, and re-enable the submit button
5. IF the API returns any other error (validation error, network failure, or server error), THEN THE Create_Dialog SHALL display the error message from the API response (or a generic connectivity message if no response body is available) and re-enable the submit button
6. WHEN the user clicks outside the Create_Dialog or activates the close control, THE Create_Dialog SHALL close without sending any API request and discard entered data

### Requirement 6: Team Detail Page — View and Edit

**User Story:** As a Green Partners user, I want to view and edit a team member's full details on a dedicated page, so that I can manage their profile, roles, and notes.

#### Acceptance Criteria

1. WHEN the user navigates to `/team/:id`, THE Team_Detail_Page SHALL display all member fields: name, email, phone, type, roles, specializations, languages, notes, extraction status, and timestamps
2. THE Team_Detail_Page SHALL render editable fields (name, email, phone, roles, notes) as form inputs in an always-editable state, with name limited to 200 characters, email validated as a valid email format, phone limited to 30 characters, and notes limited to 2000 characters
3. THE Team_Detail_Page SHALL render read-only fields (type, specializations, languages, extraction status, created_at, updated_at) as plain text that cannot be modified
4. WHEN the user clicks the "Save" button, THE Team_Detail_Page SHALL disable the Save button, send a PUT request with all modified fields, and upon success display a toast notification that auto-dismisses after 3 seconds
5. WHILE the member data is loading from the API, THE Team_Detail_Page SHALL display a loading skeleton placeholder in place of the form content
6. IF the API returns a 409 conflict on save (duplicate email), THEN THE Team_Detail_Page SHALL display an inline error below the email field indicating the email is already in use, and re-enable the Save button
7. IF the API returns a 404 for the member ID, THEN THE Team_Detail_Page SHALL display a "not found" message with a link back to the team list
8. IF the save request fails with a network error or non-409/non-404 status, THEN THE Team_Detail_Page SHALL display a toast error message indicating the save failed, and re-enable the Save button without clearing the form
9. IF the name field is empty when the user clicks Save, THEN THE Team_Detail_Page SHALL display an inline validation error on the name field and prevent the request from being sent

### Requirement 7: CV Upload

**User Story:** As a Green Partners user, I want to upload a CV file for a team member, so that the system can automatically extract their specializations and languages via LLM.

#### Acceptance Criteria

1. THE Team_Detail_Page SHALL display a CV upload zone that accepts PDF and DOCX files up to 10MB
2. WHEN the user selects a file, THE Team_Detail_Page SHALL upload it via multipart POST to `/team/:id/cv`
3. WHEN the upload completes successfully, THE Team_Detail_Page SHALL refresh the member data to display the updated extraction status and extracted fields (specializations, languages)
4. IF the selected file exceeds 10MB or has a MIME type other than `application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, THEN THE Team_Detail_Page SHALL display an error message indicating the validation failure and SHALL NOT initiate the upload request
5. WHILE the upload and extraction are in progress, THE Team_Detail_Page SHALL display a loading indicator on the upload zone and SHALL disable the upload control to prevent duplicate submissions
6. IF the CV upload request returns a non-success response or the request exceeds 60 seconds without response, THEN THE Team_Detail_Page SHALL display an error message indicating the failure and SHALL restore the upload zone to its ready state
7. IF a CV has previously been uploaded for the member (`cv_s3_key` is not null), THEN THE Team_Detail_Page SHALL display the existing CV filename and SHALL allow the user to upload a replacement file using the same upload zone

### Requirement 8: Delete Team Member

**User Story:** As a Green Partners user, I want to delete a team member with a confirmation step, so that I can remove people from the roster without accidental data loss.

#### Acceptance Criteria

1. WHEN the user clicks the "Delete" button on the Team_Detail_Page, THE Team_Management_System SHALL display a confirmation dialog that includes the team member's name, states that deletion cannot be undone, and provides both a confirm and a cancel action
2. WHEN the user confirms deletion, THE Team_Management_System SHALL disable the confirm button, send a DELETE request to the API, and navigate to /team on successful response
3. IF the delete request fails, THEN THE Team_Management_System SHALL display an error message indicating the member could not be deleted, re-enable the confirm button, and keep the user on the detail page with the dialog dismissed
4. WHEN the user clicks cancel or dismisses the confirmation dialog, THE Team_Management_System SHALL close the dialog and take no further action

### Requirement 9: Routing and Navigation

**User Story:** As a user, I want to access team management through the app navigation and URL routing, so that the feature is discoverable and bookmarkable.

#### Acceptance Criteria

1. THE Team_Management_System SHALL register a `/team` route that renders the Team_List_Page and a `/team/:id` route that renders the Team_Detail_Page in the application router
2. THE Team_Management_System SHALL add a "Team" navigation link targeting `/team`, positioned after the "Runs" link and before the "Settings" link in the navigation bar, using the same active-state styling pattern as existing navigation links
3. WHEN the user navigates to `/team/:id` and the API returns a not-found error for that ID, THE Team_Detail_Page SHALL display a not-found message and a link that navigates back to `/team`
4. WHEN the user navigates to `/team` or `/team/:id`, THE navigation bar SHALL visually indicate the "Team" link as active

### Requirement 10: Re-Extraction Warning

**User Story:** As a Green Partners user, I want to be informed when saving notes will trigger re-extraction, so that I understand the side effect of my action.

#### Acceptance Criteria

1. WHILE a CV exists for the member (`cv_s3_key` is not null) AND the user has modified the notes field, THE Team_Detail_Page SHALL display an informational message within 200ms of the modification indicating that saving will trigger re-extraction of the CV, which may update the specializations and languages fields
2. IF the member does not have a CV (`cv_s3_key` is null), THEN THE Team_Detail_Page SHALL NOT display the re-extraction warning regardless of notes field modifications
3. WHEN the user reverts the notes field content to match the last-saved value, THE Team_Detail_Page SHALL hide the re-extraction warning
4. THE Team_Detail_Page SHALL render the re-extraction warning as a non-blocking inline informational banner positioned adjacent to the notes field or the save button, without requiring user dismissal before saving
