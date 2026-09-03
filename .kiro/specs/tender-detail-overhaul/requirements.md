# Requirements Document

## Introduction

Overhaul the existing monolithic tender detail page (`TenderDetailPage.tsx`, ~376 lines) into a composable section-based architecture. Add six new sections: team requirements with match display, reference requirements with match display, exclusion criteria evaluation, unified score breakdown, user feedback (thumbs up/down), and audit trail. Each new data section includes inline action buttons to trigger backend LLM extraction/matching/evaluation endpoints. Legacy eligibility sections are superseded when new structured data exists.

## Glossary

- **Detail_Page**: The tender detail page component at route `/tenders/:sourceId/:tenderId`, serving as orchestrator for all section components
- **Section_Component**: A self-contained UI component in `src/components/tender-detail/` responsible for rendering one logical section of the detail page
- **Action_Button**: An inline button within a section that triggers a backend POST endpoint (fire-and-forget with spinner, refetch on success, toast on error)
- **Team_Requirements**: Structured LLM-extracted team roles from tender documents, stored as `team_requirements` JSONB on the tender record
- **Team_Match_Result**: Deterministic fitness scoring of team roster against extracted team requirements, stored as `team_match_result` JSONB
- **Reference_Requirements**: Structured LLM-extracted reference/experience requirements from tender documents, stored as `reference_requirements` JSONB
- **Reference_Match_Result**: Deterministic fitness scoring of project references against extracted reference requirements, stored as `reference_match_result` JSONB
- **Exclusion_Result**: LLM evaluation of exclusion criteria against company profile, stored as `exclusion_result` JSONB
- **Unified_Score**: Composite score computed as `interestingness × eval_factor × team_factor × ref_factor × exclusion_factor`
- **Feedback_Type**: User-submitted classification of a tender as `interesting` or `boring`, or `null` (no feedback)
- **Audit_Record**: A single scoring pipeline step record containing step name, model, timestamps, input snapshot, and output data
- **Legacy_Eligibility**: The existing `experts_required`, `references_required`, and `turnover_required` fields from first-pass LLM extraction

## Requirements

### Requirement 1: Page Decomposition

**User Story:** As a developer, I want the tender detail page decomposed into section components, so that each section is maintainable and testable in isolation.

#### Acceptance Criteria

1. THE Detail_Page SHALL import and compose Section_Components from `src/components/tender-detail/` covering at minimum: header, AI assessment, key facts grid, eligibility, description, documents, and system info sections
2. THE Detail_Page SHALL contain no more than 180 lines of code (excluding import statements) after decomposition, with all section-specific rendering logic delegated to Section_Components
3. THE Detail_Page SHALL pass the tender data object and event handler callbacks (document download, section expand/collapse) as props to each Section_Component
4. WHEN the tender detail query is loading, THE Detail_Page SHALL render a loading spinner
5. IF the tender detail query returns a 404, THEN THE Detail_Page SHALL render a "not found" message with a back link to the tenders list
6. IF the tender detail query returns a non-404 error, THEN THE Detail_Page SHALL render an error alert displaying the error message and a retry button that re-fetches the query

### Requirement 2: Team Requirements Section

**User Story:** As a user, I want to see extracted team requirements for a tender, so that I understand what roles the tender demands.

#### Acceptance Criteria

1. WHEN `team_requirements` is not null on the tender and `team_requirements.team_requirements` contains at least one item, THE Section_Component SHALL render a table of required roles with columns: role name, mandatory flag (displayed as yes/no), minimum years (displayed as integer or "—" when null), specializations (displayed as comma-separated list or "—" when empty), and languages (displayed as comma-separated list or "—" when empty)
2. WHEN `team_requirements` is not null and `team_requirements.team_requirements` is an empty array, THE Section_Component SHALL render the section header with a message indicating no specific roles were extracted
3. IF `team_requirements` is null and the tender status is `completed`, THEN THE Section_Component SHALL render an "Extract Team Requirements" Action_Button
4. WHEN the user clicks the "Extract Team Requirements" Action_Button, THE Section_Component SHALL call `POST /tenders/{source_id}/{tender_id}/extract-team`, show a spinner during the request, and refetch tender detail on success
5. IF the extraction Action_Button request fails, THEN THE Section_Component SHALL display an error toast containing the error message returned by the API response
6. WHEN `team_requirements` is not null, THE Section_Component SHALL display the extraction confidence level (one of: high, medium, low) and the total experts required count (or "Unknown" when `total_experts_required` is null)

### Requirement 3: Team Match Section

**User Story:** As a user, I want to see how well my team matches a tender's requirements, so that I can assess team fitness at a glance.

#### Acceptance Criteria

1. WHEN `team_match_result` is not null, THE Section_Component SHALL display the overall `team_match_score` converted from its 0–1 decimal value to a percentage (0–100%) with a colored progress indicator where the color is green for scores ≥ 0.7, amber for scores 0.4–0.69, and red for scores below 0.4
2. WHEN `team_match_result` is not null, THE Section_Component SHALL render a table of role matches showing required role name, mandatory flag, match status (matched/partial/gap), best match team member name (or empty if null), and individual match score displayed as a percentage (0–100%)
3. WHEN a role match has a `best_match` with a team member `id`, THE Section_Component SHALL render the team member name as a link navigating to `/team/{id}`
4. WHEN `team_match_result` contains one or more gaps, THE Section_Component SHALL render a gap summary listing each gap's role name, mandatory flag, and severity (high/low) with high-severity gaps visually distinguished from low-severity gaps
5. WHEN `team_requirements` is not null and `team_match_result` is null, THE Section_Component SHALL render a "Run Team Match" Action_Button
6. WHEN the user clicks the "Run Team Match" Action_Button, THE Section_Component SHALL disable the button, display a spinner in place of the button label, call `POST /tenders/{source_id}/{tender_id}/team-match`, and refetch the tender detail query on success
7. IF the team match Action_Button request fails, THEN THE Section_Component SHALL re-enable the button, hide the spinner, and display an error toast showing the error detail that auto-dismisses after 5 seconds
8. WHEN `team_match_result` is not null and `role_matches` is an empty array, THE Section_Component SHALL display the overall score with the progress indicator and show an empty state message in place of the role matches table

### Requirement 4: Reference Requirements Section

**User Story:** As a user, I want to see extracted reference requirements for a tender, so that I understand what project experience the tender demands.

#### Acceptance Criteria

1. WHEN `reference_requirements` is not null on the tender and the `reference_requirements.reference_requirements` array contains at least one item, THE Section_Component SHALL render a table with one row per reference requirement showing columns: domain, mandatory flag, min_projects, min_value_eur (formatted as EUR currency), max_age_years, region, donor_preference, and notes — where null cell values are displayed as a dash ("—")
2. WHEN `reference_requirements` is not null and the `reference_requirements.reference_requirements` array is empty, THE Section_Component SHALL display a message indicating that extraction completed but no reference requirements were found in the tender documents
3. WHEN `reference_requirements` is null and the tender status is `completed`, THE Section_Component SHALL render an "Extract Reference Requirements" Action_Button
4. WHEN the user clicks the "Extract Reference Requirements" Action_Button, THE Section_Component SHALL disable the button, show a spinner within the button, call `POST /tenders/{source_id}/{tender_id}/extract-references`, and refetch tender detail on success
5. IF the extraction Action_Button request fails, THEN THE Section_Component SHALL display an error toast containing the error detail returned by the API and re-enable the button
6. WHEN `reference_requirements` is not null, THE Section_Component SHALL display the `extraction_confidence` value (high, medium, or low) as a labeled badge and display `total_references_required` as a count — showing "Unknown" if `total_references_required` is null

### Requirement 5: Reference Match Section

**User Story:** As a user, I want to see how well my project references match a tender's requirements, so that I can assess reference fitness.

#### Acceptance Criteria

1. WHEN `reference_match_result` is not null, THE Section_Component SHALL display the overall `reference_match_score` as a percentage (score × 100, rounded to nearest integer) with a colored progress indicator using green for scores ≥ 70%, amber for scores 40%–69%, and red for scores below 40%
2. WHEN `reference_match_result` is not null, THE Section_Component SHALL render a list of requirement matches showing domain, a mandatory/optional badge based on the `mandatory` field, match status (matched/partial/gap), coverage count, and up to 3 best match titles sorted by descending `match_score`
3. WHEN `reference_match_result` contains a non-empty `gaps` array, THE Section_Component SHALL render a gap summary showing domain names with a visual severity indicator distinguishing high severity from low severity
4. WHEN `reference_requirements` is not null and `reference_match_result` is null, THE Section_Component SHALL render a "Run Reference Match" Action_Button
5. WHEN the user clicks the "Run Reference Match" Action_Button, THE Section_Component SHALL call `POST /tenders/{source_id}/{tender_id}/reference-match`, show a spinner, and refetch tender detail on success
6. IF the reference match Action_Button request fails, THEN THE Section_Component SHALL display an error toast with the error detail
7. WHEN `reference_match_result` is not null and the `requirement_matches` array is empty, THE Section_Component SHALL display an empty state message indicating no requirement matches were found

### Requirement 6: Exclusion Criteria Section

**User Story:** As a user, I want to see whether a tender has exclusion criteria that disqualify my company, so that I avoid wasting effort on ineligible tenders.

#### Acceptance Criteria

1. WHEN `exclusion_result` is not null and `excluded` is true, THE Detail_Page SHALL render a red banner at the top of the page displaying the `exclusion_reasons` array as a bulleted list
2. WHEN `exclusion_result` is not null and `excluded` is false, THE Detail_Page SHALL NOT render the exclusion banner
3. WHEN `exclusion_result` is not null and `criteria` array contains one or more items, THE Section_Component SHALL render a table with columns: criterion name, category, assessment (pass/fail/uncertain), confidence (high/medium/low), and reason
4. WHEN `exclusion_result` is not null and `criteria` array is empty, THE Section_Component SHALL display a message indicating no exclusion criteria were identified
5. WHEN `exclusion_result` contains `uncertain_flags` with one or more items, THE Section_Component SHALL display a warning callout above the criteria table listing the uncertain criterion names
6. WHEN `exclusion_result` is null and the tender status is `completed`, THE Section_Component SHALL render a "Check Exclusion" Action_Button
7. WHEN the user clicks the "Check Exclusion" Action_Button, THE Section_Component SHALL call `POST /tenders/{source_id}/{tender_id}/check-exclusion`, show a spinner on the button, and refetch tender detail on success
8. IF the check exclusion Action_Button request fails, THEN THE Section_Component SHALL display an error toast with the error detail and restore the button to its idle state
9. WHEN `exclusion_result` is not null, THE Section_Component SHALL display the `extraction_confidence` value (high/medium/low) as a labeled badge below the section heading

### Requirement 7: Unified Score Breakdown Section

**User Story:** As a user, I want to see how the unified score is computed from individual factors, so that I understand which factors contribute or penalize the overall score.

#### Acceptance Criteria

1. WHEN the tender has a non-null `unified_score`, THE Section_Component SHALL display the final unified score value formatted to 2 decimal places at the top of the section, using a larger font size than the factor rows
2. IF the tender has a null `unified_score`, THEN THE Section_Component SHALL display the section with a label indicating the score has not been computed yet and SHALL NOT display factor rows
3. THE Section_Component SHALL render a vertical list of scoring factors in fixed order: interestingness, eval_factor, team_factor, ref_factor, and exclusion_factor
4. WHEN a scoring factor has a computed value, THE Section_Component SHALL display the factor name, the source sub-score value (e.g., relevance_score, team_match_score), the computed factor value formatted to 2 decimal places, and a progress bar filled proportionally to the factor value within its possible range (0.0 to 1.0)
5. WHEN a scoring factor cannot be computed (source value is null), THE Section_Component SHALL display the factor name with a "Pending" label and a progress bar at 0% fill with muted styling, indicating no penalty is applied (neutral factor = 1.0)
6. THE Section_Component SHALL compute factors client-side using these formulas: interestingness = interestingness_score / 10 (normalizing the integer 0–10 API value to 0.0–1.0), eval_factor = 0.6 + (relevance_score / 10) × 0.4, team_factor = 0.7 + team_match_score × 0.3, ref_factor = 0.7 + reference_match_score × 0.3, exclusion_factor = 0.0 if exclusion_result.excluded is true else 1.0
7. IF exclusion_factor is 0.0, THEN THE Section_Component SHALL display the exclusion_factor row with a destructive/red color indicator to visually signal that this factor zeroes out the entire score

### Requirement 8: Feedback Buttons

**User Story:** As a user, I want to mark tenders as interesting or boring, so that the system can calibrate interestingness scoring over time.

#### Acceptance Criteria

1. THE Section_Component SHALL render two mutually exclusive toggle buttons: thumbs-up (interesting) and thumbs-down (boring), where at most one button can be in active state at any time
2. IF the tender has `feedback_type` equal to "interesting", THEN THE Section_Component SHALL render the thumbs-up button in active/selected state and the thumbs-down button in inactive state
3. IF the tender has `feedback_type` equal to "boring", THEN THE Section_Component SHALL render the thumbs-down button in active/selected state and the thumbs-up button in inactive state
4. IF the tender has `feedback_type` equal to null, THEN THE Section_Component SHALL render both buttons in inactive state
5. WHEN the user clicks a feedback button that is not currently active, THE Section_Component SHALL call `POST /tenders/{source_id}/{tender_id}/feedback` with the selected `feedback_type` value, immediately transition the clicked button to active state and the other button to inactive state before the server responds
6. WHEN the user clicks a feedback button that is currently active, THE Section_Component SHALL call `DELETE /tenders/{source_id}/{tender_id}/feedback`, immediately transition both buttons to inactive state before the server responds
7. IF a feedback mutation fails, THEN THE Section_Component SHALL revert the button states to their pre-click values and display an error toast indicating the feedback could not be saved

### Requirement 9: Audit Trail Section

**User Story:** As a user, I want to inspect the scoring pipeline audit trail for a tender, so that I can verify and debug how scores were computed.

#### Acceptance Criteria

1. THE Section_Component SHALL render the audit trail section collapsed by default, WHEN the user expands the audit trail section, THE Section_Component SHALL call `GET /tenders/{source_id}/{tender_id}/audit` and display results as a collapsible accordion list ordered by `created_at` descending
2. WHEN expanded, THE Section_Component SHALL display a loading indicator while the audit endpoint request is in flight
3. THE Section_Component SHALL provide a step filter dropdown with an "All" default option and the following values: analysis, team_extraction, team_match, reference_extraction, reference_match, exclusion, interestingness, unified_score
4. WHEN a step filter is selected, THE Section_Component SHALL pass the `step` query parameter to the audit endpoint and refetch results
5. THE Section_Component SHALL display each audit record header showing: step name, model name (or "—" if `model` is null), timestamp formatted as locale date-time, and duration in milliseconds (or "—" if `duration_ms` is null)
6. WHEN the user expands an audit record accordion item, THE Section_Component SHALL display `input_snapshot` and `output` as syntax-highlighted formatted JSON in a scrollable container with a maximum height of 400px
7. IF the audit endpoint returns an empty array, THEN THE Section_Component SHALL display an empty-state message indicating no audit records exist for the current filter selection
8. IF the audit endpoint request fails, THEN THE Section_Component SHALL display an error message indicating the failure and provide a retry action

### Requirement 10: Legacy Eligibility Supersession

**User Story:** As a user, I want the legacy eligibility section to be hidden when detailed structured data exists, so that I see only the most accurate and current information.

#### Acceptance Criteria

1. WHEN `team_requirements` is not null, THE Detail_Page SHALL hide the legacy `experts_required` eligibility sub-section even if `experts_required` contains data
2. WHEN `reference_requirements` is not null, THE Detail_Page SHALL hide the legacy `references_required` eligibility sub-section even if `references_required` contains data
3. IF both `team_requirements` and `reference_requirements` are null, THEN THE Detail_Page SHALL render each legacy eligibility sub-section (`experts_required`, `references_required`, `turnover_required`) independently when its respective field is not null
4. THE Detail_Page SHALL render the `turnover_required` sub-section whenever `turnover_required` is not null, regardless of `team_requirements` or `reference_requirements` presence
5. IF all visible eligibility sub-sections are hidden or null (i.e., `experts_required` is superseded or null, `references_required` is superseded or null, and `turnover_required` is null), THEN THE Detail_Page SHALL not render the "Eligibility Requirements" section heading

### Requirement 11: Data Layer

**User Story:** As a developer, I want TypeScript interfaces, API endpoint functions, and TanStack Query hooks for all new tender detail features, so that components consume typed data through a consistent pattern.

#### Acceptance Criteria

1. THE Data_Layer SHALL define TypeScript interfaces matching the API response shapes for: `TeamRequirement` (role, specializations, mandatory, min_years, languages, notes), `TeamRequirementsData` (team_requirements array, total_experts_required, extraction_confidence, extraction_source, documents_used), `RoleMatch` (required_role, mandatory, best_match, match_score, status), `BestMatch` (id, name, type, match_score, duplicate_roles), `TeamMatchResult` (team_match_score, role_matches, gaps, external_experts_needed, message), `ReferenceRequirement` (extracted reference requirement fields from API), `RequirementMatch` (reference requirement match entry), `ReferenceBestMatch` (matched reference details), `ReferenceMatchResult` (reference_match_score, requirement_matches, gaps), `ExclusionCriterion` (single exclusion criterion entry), `ExclusionResult` (excluded boolean, exclusion_reasons, criteria), `AuditRecord` (id, step, run_id, created_at, input_snapshot, output, model, model_version, duration_ms), `FeedbackRequest` (feedback_type enum of "interesting" or "boring"), and `FeedbackResponse` (pk, source_id, tender_id, feedback_type, created_at)
2. THE Data_Layer SHALL extend `TenderDetailResponse` with nullable fields: `team_requirements: TeamRequirementsData | null`, `team_match_result: TeamMatchResult | null`, `reference_requirements: object | null`, `reference_match_result: ReferenceMatchResult | null`, `exclusion_result: ExclusionResult | null`, `feedback_type: "interesting" | "boring" | null`, and `interestingness_reasoning: string | null`
3. THE Data_Layer SHALL define endpoint functions using the following HTTP methods and paths: `extractTeamRequirements(sourceId, tenderId)` → POST `/tenders/{source_id}/{tender_id}/extract-team`, `runTeamMatch(sourceId, tenderId)` → POST `/tenders/{source_id}/{tender_id}/team-match`, `extractReferenceRequirements(sourceId, tenderId)` → POST `/tenders/{source_id}/{tender_id}/extract-references`, `runReferenceMatch(sourceId, tenderId)` → POST `/tenders/{source_id}/{tender_id}/reference-match`, `checkExclusion(sourceId, tenderId)` → POST `/tenders/{source_id}/{tender_id}/check-exclusion`, `submitFeedback(sourceId, tenderId, body)` → POST `/tenders/{source_id}/{tender_id}/feedback`, `deleteFeedback(sourceId, tenderId)` → DELETE `/tenders/{source_id}/{tender_id}/feedback`, and `getTenderAudit(sourceId, tenderId, params)` → GET `/tenders/{source_id}/{tender_id}/audit`
4. THE Data_Layer SHALL define custom hooks with the following query keys and behaviors: `useTenderAudit(sourceId, tenderId, step?)` using query key `['tenderAudit', sourceId, tenderId, { step }]` returning `AuditRecord[]`; `useTenderFeedback(sourceId, tenderId)` exposing `submitMutation` and `deleteMutation` that optimistically update the `feedback_type` field in the cached `['tender', sourceId, tenderId]` query data and roll back to the previous value on error via `onError`; and `useTenderActions(sourceId, tenderId)` exposing mutations for extract/match/exclusion that invalidate the `['tender', sourceId, tenderId]` query on success
5. THE Data_Layer SHALL use `apiPost` for action endpoints (extract-team, team-match, extract-references, reference-match, check-exclusion, feedback submit), `apiDelete` for the delete-feedback endpoint, and `apiFetch` for the audit GET endpoint, following existing patterns in `src/api/client.ts`
