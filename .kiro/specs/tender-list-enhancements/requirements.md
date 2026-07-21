# Requirements Document

## Introduction

Enhance the existing tender list page with full-text search, two additional score columns (interestingness and unified), and a minimum interestingness filter. These additions enable users to discover and evaluate tenders more effectively by searching across tender content, viewing scoring signals at a glance, and filtering out low-interest tenders.

## Glossary

- **Tender_List_Page**: The page component at `/tenders` that displays a filterable, sortable, paginated table of tenders
- **Search_Input**: A debounced text input field for full-text search queries, synced to the URL via a `q` parameter
- **Score_Column**: A table column displaying a numeric score value as a badge/pill element
- **Interestingness_Score**: An integer score (1–10, nullable) assigned by the scoring pipeline indicating how interesting a tender is to the user's profile
- **Unified_Score**: A float score (0–10 scale, nullable) combining multiple scoring signals into a single relevance metric
- **Min_Interestingness_Filter**: A select dropdown allowing users to set a minimum interestingness score threshold (1–10)
- **Sort_Control**: A clickable table header that toggles sort direction for a given field
- **API_Backend**: The REST API that serves tender data, supports full-text search via `q` parameter, filtering via `min_interestingness`, and sorting via `sort_by`/`sort_direction` parameters

## Requirements

### Requirement 1: Full-Text Search Input

**User Story:** As a user, I want to search tenders by text, so that I can quickly find tenders matching specific keywords across title, description, organization, and sectors.

#### Acceptance Criteria

1. THE Tender_List_Page SHALL display a Search_Input above the table that accepts free-text queries up to 200 characters in length
2. WHEN a user types in the Search_Input, THE Search_Input SHALL debounce the input for 300 milliseconds before updating the URL `q` parameter
3. WHEN the `q` URL parameter is set, THE Tender_List_Page SHALL send the `q` parameter to the API_Backend and reset pagination to the first page
4. WHEN the `q` URL parameter is set, THE Tender_List_Page SHALL render all Sort_Control column headers as non-interactive (no pointer cursor, no click handler, visually muted) and omit sort parameters from the API request
5. WHEN the `q` URL parameter is cleared, THE Tender_List_Page SHALL re-enable all Sort_Control elements and apply the default sort order (discovered_at descending)
6. WHEN the page loads with a `q` URL parameter present, THE Search_Input SHALL display the value from the URL
7. IF the user clears the Search_Input text, THEN THE Tender_List_Page SHALL remove the `q` parameter from the URL and reset pagination to the first page

### Requirement 2: Search Empty State

**User Story:** As a user, I want clear feedback when my search returns no results, so that I understand no tenders matched and can easily reset the search.

#### Acceptance Criteria

1. WHEN a search query (`q` URL parameter is non-empty) returns zero items, THE Tender_List_Page SHALL display a "No tenders match your search" message within the table body area while keeping the table column headers visible
2. WHEN a search query returns zero items, THE Tender_List_Page SHALL display a "Clear search" button visually grouped with the empty state message inside the table body area
3. WHEN the user clicks the "Clear search" button, THE Tender_List_Page SHALL remove only the `q` URL parameter and preserve all other active filters (status, source_id, date range, analyzed), triggering a re-fetch without the search term
4. IF the tender list returns zero items and the `q` URL parameter is empty, THEN THE Tender_List_Page SHALL display the existing generic "No tenders found" empty state instead of the search-specific empty state

### Requirement 3: Interestingness Score Column

**User Story:** As a user, I want to see the interestingness score for each tender in the list, so that I can quickly identify tenders that match my interest profile.

#### Acceptance Criteria

1. THE Tender_List_Page SHALL display an "Interestingness" Score_Column in the table, positioned after the existing Relevance Score_Column, showing the Interestingness_Score for each tender
2. WHEN a tender has a null Interestingness_Score, THE Score_Column SHALL display "—" (em dash) as a placeholder rendered inside the same ScoreBadge component shell with a gray/neutral style
3. WHEN a tender has a non-null Interestingness_Score (integer 1–10), THE Score_Column SHALL display the integer value using the existing ScoreBadge component, applying the same color-scale logic as the Relevance score (green for 7–10, yellow for 4–6, red for 1–3)
4. THE Interestingness_Score column header SHALL function as a Sort_Control with click-to-toggle behavior (clicking cycles: descending → ascending → no sort), triggering a server-side sort by sending `sort_by=interestingness_score` and the corresponding `sort_direction` parameter to the API
5. WHILE the Interestingness_Score Sort_Control is active, THE column header SHALL display a directional sort indicator (▲ or ▼) matching the current sort direction, using the same `sortIndicator` and `aria-sort` pattern as other sortable columns
6. WHEN sorting by Interestingness_Score, THE Tender_List_Page SHALL display tenders with null Interestingness_Score last regardless of sort direction (backend-guaranteed behavior: nulls sort last)

### Requirement 4: Unified Score Column

**User Story:** As a user, I want to see the unified score for each tender in the list, so that I can assess overall tender quality at a glance.

#### Acceptance Criteria

1. THE Tender_List_Page SHALL display a "Unified" Score_Column in the table showing the Unified_Score for each tender
2. WHEN a tender has a null Unified_Score, THE Score_Column SHALL display "—" (em dash) as a placeholder in a gray badge matching the existing ScoreBadge null-state style
3. WHEN a tender has a non-null Unified_Score, THE Score_Column SHALL display the value formatted to one decimal place (e.g., "3.2") inside a rounded pill using the same color thresholds as the existing ScoreBadge (green for 7.0–10.0, yellow for 4.0–6.9, red for 0.1–3.9, gray labeled "Filtered" for exactly 0.0)
4. THE Unified_Score column header SHALL function as a Sort_Control, toggling between ascending and descending sort by `unified_score` on each click, following the same toggle and aria-sort behavior as existing sortable column headers
5. WHILE the `q` URL parameter is non-empty, THE Unified_Score Sort_Control SHALL be visually disabled and non-interactive, consistent with the search-sort interaction defined in Requirement 7

### Requirement 5: Minimum Interestingness Filter

**User Story:** As a user, I want to filter tenders by a minimum interestingness score, so that I only see tenders above a certain interest threshold.

#### Acceptance Criteria

1. THE Tender_List_Page SHALL display a Min_Interestingness_Filter dropdown in the filter bar
2. THE Min_Interestingness_Filter SHALL offer options representing threshold values 1 through 10 (displayed as "1+", "2+", … "10+") plus an "All" option for no filter, with "All" selected by default when no `min_interestingness` URL parameter is present
3. WHEN the user selects a threshold value, THE Tender_List_Page SHALL set the `min_interestingness` URL parameter to the selected integer, reset pagination to the first page, and re-fetch tenders from the API_Backend with the updated parameter
4. WHEN the user selects "All", THE Tender_List_Page SHALL remove the `min_interestingness` URL parameter and re-fetch tenders from the API_Backend without the parameter
5. WHEN the page loads with a `min_interestingness` URL parameter containing a valid integer between 1 and 10, THE Min_Interestingness_Filter SHALL display the corresponding option as selected
6. IF the page loads with a `min_interestingness` URL parameter that is not a valid integer between 1 and 10, THEN THE Min_Interestingness_Filter SHALL fall back to "All" (no filter applied) and remove the invalid parameter from the URL

### Requirement 6: Type Definitions

**User Story:** As a developer, I want the TypeScript types to include the new API fields and parameters, so that the application has type-safe access to interestingness and unified scores and search/filter parameters.

#### Acceptance Criteria

1. THE TenderListItem type SHALL include an `interestingness_score` field typed as `number | null`
2. THE TenderListItem type SHALL include a `unified_score` field typed as `number | null`
3. THE TenderListParams type SHALL include a `q` field typed as `string | undefined`
4. THE TenderListParams type SHALL include a `min_interestingness` field typed as `string | undefined`
5. WHEN TypeScript strict mode compiles the project after adding these fields, THE build SHALL produce zero type errors related to undefined property access on `interestingness_score`, `unified_score`, `q`, or `min_interestingness`
6. IF existing code accesses `TenderListItem` properties via destructuring or dot notation, THEN THE new nullable fields SHALL not require changes to existing consumers (fields are additive and nullable/optional)

### Requirement 7: Sort and Search Interaction

**User Story:** As a user, I want sort controls to be visually disabled during search, so that I understand results are ranked by search relevance and not by a column sort.

#### Acceptance Criteria

1. WHILE the `q` URL parameter is non-empty, THE Tender_List_Page SHALL render each Sort_Control element with opacity reduced to 0.5 and cursor set to `default` (not `pointer`)
2. WHILE the `q` URL parameter is non-empty, THE Sort_Control elements SHALL not respond to click events and SHALL not change the `sort` URL parameter
3. WHILE the `q` URL parameter is non-empty, THE Tender_List_Page SHALL preserve the current `sort` and `order` URL parameter values without clearing them
4. WHEN the `q` URL parameter becomes empty (cleared or removed), THE Sort_Control elements SHALL return to full opacity and pointer cursor within the same render cycle, and the sort indicated by the preserved `sort` and `order` URL parameters SHALL be applied to the next data fetch
5. IF a user navigates directly to a URL containing both a non-empty `q` parameter and a `sort` parameter, THEN THE Tender_List_Page SHALL display Sort_Control elements in their inactive visual state and rank results by search relevance (ignoring the `sort` parameter for data fetching)
