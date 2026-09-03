# Requirements Document

## Introduction

Redesign the tender detail page from a flat vertical dump of 12+ equal-weight sections into a verdict-first progressive disclosure layout. The page adapts its rendering based on tender lifecycle state (skipped, unanalyzed, legacy analyzed, fully analyzed) and organizes match fitness dimensions into a tabbed interface. Action buttons move to a dropdown, the raw description hides behind AI summaries, and developer tooling collapses out of sight.

## Glossary

- **Detail_Page**: The tender detail route (`/tenders/:sourceId/:tenderId`) that renders a single tender's full information
- **Tender_State**: One of four lifecycle states determining what data is available: skipped, unanalyzed, legacy_analyzed, or fully_analyzed
- **Header_Zone**: Top section displaying title, organization, score badge, deadline, location, source link, feedback icons, and tag pills
- **Verdict_Zone**: Section below the header showing unified score with factor bars alongside AI summary and fit analysis
- **Match_Fitness_Section**: Tabbed area with three tabs (Team, References, Exclusion) merging requirements and match results per dimension
- **Details_Section**: Collapsible area containing key facts, documents, and raw description
- **Developer_Section**: Collapsed section containing system info and audit trail for ops use
- **Actions_Dropdown**: A dropdown menu in the page header containing power-user operations (Extract, Run, Check)
- **Factor_Bar**: A color-coded horizontal bar in the Verdict Zone representing a score dimension (team, references, exclusion)
- **Legacy_Eligibility**: Older analysis fields (experts_required, references_required, turnover_required) that predate structured extraction
- **List_Page**: The tender list route (`/tenders`) showing all tenders in a paginated table

## Requirements

### Requirement 1: State Detection

**User Story:** As a developer, I want the detail page to detect the tender's lifecycle state from its data fields, so that rendering logic can branch correctly.

#### Acceptance Criteria

1. THE Detail_Page SHALL evaluate state classification rules in the following precedence order: `skipped` first, then `fully_analyzed`, then `legacy_analyzed`, then `unanalyzed` — the first matching rule determines the tender's state.
2. WHEN a tender has a non-null `skip_reason`, THE Detail_Page SHALL classify the tender as `skipped` state regardless of any analysis fields present.
3. WHEN a tender has non-null `team_requirements` OR non-null `reference_requirements` OR non-null `exclusion_result`, THE Detail_Page SHALL classify the tender as `fully_analyzed` state.
4. WHEN a tender has non-null legacy fields (`experts_required` OR `references_required` OR `turnover_required`) AND null `team_requirements` AND null `reference_requirements` AND null `exclusion_result`, THE Detail_Page SHALL classify the tender as `legacy_analyzed` state.
5. IF none of the above conditions match, THEN THE Detail_Page SHALL classify the tender as `unanalyzed` state.
6. THE Detail_Page SHALL derive exactly one state per tender — the classification function SHALL return a single value from the set: `skipped`, `fully_analyzed`, `legacy_analyzed`, `unanalyzed`.

### Requirement 2: Skipped Tender Blocking

**User Story:** As a user, I want skipped tenders to be inaccessible from the detail page, so that I don't land on a confusing mostly-empty page.

#### Acceptance Criteria

1. WHEN a user navigates to the Detail_Page for a tender with status `skipped`, THE Detail_Page SHALL redirect the user to the List_Page before rendering any detail content
2. IF a tender's status is `skipped` and `skip_reason` is non-null, THEN THE List_Page SHALL display the skip reason in a tooltip triggered by hovering over the skipped tender's status indicator
3. IF a tender's status is `skipped` and `skip_reason` is null, THEN THE List_Page SHALL display a generic label "Skipped" with no tooltip
4. IF a tender's status is `skipped`, THEN THE List_Page SHALL display a link to the tender's page on the source website, opening in a new browser tab

### Requirement 3: Header Zone Layout

**User Story:** As a user, I want a compact header showing the most important identifying information, so that I can orient myself quickly.

#### Acceptance Criteria

1. THE Header_Zone SHALL display the tender title as the primary heading, truncated with an ellipsis after 200 characters
2. THE Header_Zone SHALL display the organization name directly below or beside the title; IF organization is null, THEN THE Header_Zone SHALL display the text "Unknown organization"
3. THE Header_Zone SHALL display a Score_Badge showing the unified_score value formatted to one decimal place, with color coding: green for scores ≥ 7.0, yellow for scores ≥ 4.0 and < 7.0, red for scores > 0 and < 4.0, gray with label "Filtered" for score equal to 0, gray with label "—" for null
4. WHEN deadline is not null, THE Header_Zone SHALL display the deadline formatted as "DD Mon YYYY" (e.g. "15 Jan 2025"); IF deadline is null, THEN THE Header_Zone SHALL display the text "No deadline"
5. WHEN location_names is not null, THE Header_Zone SHALL display the location_names value; IF location_names is null, THEN THE Header_Zone SHALL omit the location field entirely
6. THE Header_Zone SHALL display a link to the source tender page, constructed as "https://www.developmentaid.org/tenders/view/{tender_id}", opening in a new browser tab
7. WHEN analysis_tags is a non-empty array, THE Header_Zone SHALL display each tag as a pill-shaped badge using muted/secondary color styling; WHEN analysis_tags is empty or null, THE Header_Zone SHALL not render the tags area
8. THE Header_Zone SHALL display feedback controls as two icon buttons (interesting and boring); WHEN feedback_type matches a button, THE Header_Zone SHALL render that button in its active visual state; WHEN a user clicks a feedback button, THE Header_Zone SHALL submit the feedback_type value to the API and update the button to active state
9. THE Header_Zone SHALL NOT display the types field
10. THE Header_Zone SHALL NOT display the posted_date field
11. WHEN the tender warnings array contains one or more entries, THE Detail_Page SHALL display a warnings banner above the Header_Zone listing each warning string as a separate line

### Requirement 4: Verdict Zone

**User Story:** As a Green Partners employee, I want to see the unified score with factor breakdowns next to the AI summary, so that I can quickly answer "should I pursue this?" without scrolling.

#### Acceptance Criteria

1. THE Verdict_Zone SHALL display in a two-column layout: score and factor bars on the left, AI summary and fit analysis on the right
2. WHEN unified_score is non-null and greater than zero, THE Verdict_Zone left column SHALL display the unified_score as a large numeric value formatted to one decimal place, with the Score_Badge color scheme (green for scores ≥ 7.0, yellow for scores ≥ 4.0 and < 7.0, red for scores > 0 and < 4.0)
3. IF unified_score is null or zero, THEN THE Verdict_Zone left column SHALL omit the score numeric display entirely — no placeholder, gray badge, or empty container shall render for that element
4. THE Verdict_Zone left column SHALL display Factor_Bars for team_match_score (labeled "Team") and reference_match_score (labeled "References"), each rendered as a horizontal bar filled proportionally to the 0–1 value and displaying the score as a percentage (0–100%), with color coding: green when score ≥ 0.7, yellow when score ≥ 0.4 and < 0.7, red when score < 0.4
5. THE Verdict_Zone left column SHALL display a Factor_Bar for exclusion assessment (labeled "Exclusion") as a binary indicator: green labeled "Pass" when excluded is false, red labeled "Excluded" when excluded is true
6. THE Verdict_Zone right column SHALL display the analysis_context (fit analysis) as primary content
7. THE Verdict_Zone right column SHALL display the analysis_summary below the fit analysis
8. WHEN analysis_context is null, THE Verdict_Zone right column SHALL display the analysis_summary as primary content
9. WHEN both analysis_context and analysis_summary are null, THE Verdict_Zone right column SHALL display the interestingness_reasoning as fallback content
10. WHEN analysis_context, analysis_summary, and interestingness_reasoning are all null, THE Verdict_Zone right column SHALL display an empty state indicating no AI analysis is available for this tender
11. THE Verdict_Zone SHALL NOT render when Tender_State is "unanalyzed"
12. WHEN Factor_Bars data is partially available (e.g. team_match_score exists but reference_match_score is null, or exclusion_result is null), THE Verdict_Zone SHALL display only the factor bars for which data is non-null and omit bars for null results

### Requirement 5: Match Fitness Tabs

**User Story:** As a user, I want match fitness organized into tabs by dimension, so that I can drill into team, references, or exclusion concerns without scrolling past irrelevant content.

#### Acceptance Criteria

1. WHEN a tender is in `fully_analyzed` state, THE Match_Fitness_Section SHALL render three tabs in fixed order: Team (first), References (second), and Exclusion (third), with the Team tab selected by default on initial render
2. THE Team tab SHALL merge team requirements and team match results into a single unified view showing roles, specializations, mandatory flag, min_years, languages alongside match status (matched/partial/gap), best match name, and match score
3. THE References tab SHALL merge reference requirements and reference match results into a single unified view showing domain, min_projects, min_value_eur, max_age_years, region, mandatory alongside match status, coverage_count, and best_matches
4. THE Exclusion tab SHALL display exclusion criteria with their assessments (pass/fail/uncertain), confidence level, category, and reason text
5. WHEN a tender is in `legacy_analyzed` state, THE Match_Fitness_Section SHALL display legacy eligibility data mapped to tabs as follows: `experts_required` in the Team tab, `references_required` in the References tab, and `turnover_required` in the Exclusion tab — each showing the `notes` field as primary content with numeric fields as secondary
6. WHEN a tender is in `unanalyzed` state, THE Detail_Page SHALL NOT render the Match_Fitness_Section
7. WHEN the Team tab has no data (both `team_requirements` and `experts_required` are null), THE Match_Fitness_Section SHALL display an empty state message indicating no team data has been extracted
8. WHEN the References tab has no data (both `reference_requirements` and `references_required` are null), THE Match_Fitness_Section SHALL display an empty state message indicating no reference data has been extracted
9. WHEN the Exclusion tab has no data (both `exclusion_result` and `turnover_required` are null), THE Match_Fitness_Section SHALL display an empty state message indicating no exclusion data has been extracted

### Requirement 6: Details Section Behavior

**User Story:** As a user, I want operational details available but not competing for attention, so that the verdict-first hierarchy is preserved.

#### Acceptance Criteria

1. WHEN a tender has a non-null `analysis_summary`, THE Details_Section SHALL render the raw description fully collapsed (0 lines visible) with a "View raw description" link that, when clicked, expands to show the full `description_text` content
2. WHEN a tender has a null `analysis_summary` (unanalyzed state), THE Details_Section SHALL display the raw `description_text` fully expanded with no truncation
3. IF the tender's `description_text` is null, THEN THE Details_Section SHALL hide the description area entirely regardless of `analysis_summary` state
4. THE Details_Section SHALL display key facts including: budget (with currency when non-null), tender type, deadline, and location — where `budget` of 0 is displayed as "Not specified" rather than "0" or "€0"
5. THE Details_Section SHALL humanize the `tender_type` field by replacing underscores with spaces and capitalizing each word (e.g., "request_to_participate" → "Request To Participate"), and display "—" when `tender_type` is null
6. THE Details_Section SHALL display the documents list with a download action per document, a loading indicator while fetching, an error message with retry option on fetch failure, and the text "No documents available" when the list is empty
7. WHEN the expanded description exceeds the viewport, THE Details_Section SHALL provide a "Show less" action to re-collapse the description to its hidden state

### Requirement 7: Actions Dropdown

**User Story:** As a power user, I want extraction and re-run actions accessible from a dropdown, so that they don't clutter the primary interface but remain available when needed.

#### Acceptance Criteria

1. THE Header_Zone SHALL contain an Actions_Dropdown button that opens a menu overlay on click
2. THE Actions_Dropdown SHALL include menu items in this order: Extract Team Requirements, Run Team Match, Extract Reference Requirements, Run Reference Match, Check Exclusion Criteria
3. WHEN a menu item is activated, THE Actions_Dropdown SHALL close the menu and trigger the corresponding API mutation (Extract Team Requirements → POST extract-team, Run Team Match → POST team-match, Extract Reference Requirements → POST extract-references, Run Reference Match → POST reference-match, Check Exclusion Criteria → POST check-exclusion)
4. WHILE a mutation is in progress, THE Actions_Dropdown SHALL display a spinner icon on the triggered menu item and disable that item until the mutation completes or fails
5. IF a mutation fails, THEN THE Actions_Dropdown SHALL display an inline error message indicating which action failed, dismissible by the user
6. WHEN a tender is in `unanalyzed` state, THE Actions_Dropdown SHALL still be rendered (extraction can be triggered manually)
7. WHILE one or more mutations are in progress, THE Actions_Dropdown SHALL allow activating other menu items independently (no global lock)

### Requirement 8: Developer Section

**User Story:** As a developer, I want system info and audit trail tucked away in a collapsed section, so that ops tooling doesn't interfere with the user-facing layout.

#### Acceptance Criteria

1. THE Developer_Section SHALL render collapsed by default, showing only a toggle header labeled "Developer" that indicates the collapsed/expanded state
2. WHEN the user activates the Developer_Section toggle, THE Developer_Section SHALL expand to display system info fields: retry count (integer), last attempt (ISO 8601 timestamp or "—" if null), last error (string or "—" if null), S3 prefix (string or "—" if null), discovered run ID (string or "—" if null), processed run ID (string or "—" if null), and analysis model (string or "—" if null)
3. WHEN the user activates the toggle on an expanded Developer_Section, THE Developer_Section SHALL collapse back to header-only state
4. WHEN expanded, THE Developer_Section SHALL display audit trail records ordered by created_at descending, showing for each record: step name, run ID, created_at timestamp, model name, model version, and duration in milliseconds
5. IF the audit trail API request fails, THEN THE Developer_Section SHALL display an error message indicating the audit data could not be loaded, without affecting the system info fields already rendered from the tender detail response
6. IF there are zero audit trail records, THEN THE Developer_Section SHALL display a "No audit records" empty-state message in place of the record list
7. THE Developer_Section SHALL be rendered after all user-facing content sections, as the last section on the page

### Requirement 9: State-Aware Full Page Rendering

**User Story:** As a user, I want the page to show only relevant sections for the current tender state, so that I never see confusing empty placeholders.

#### Acceptance Criteria

1. WHEN a tender is in `unanalyzed` state, THE Detail_Page SHALL render the following sections in this order: Header_Zone, Details_Section (with description_text visible without user interaction), and Documents section
2. WHEN a tender is in `legacy_analyzed` state, THE Detail_Page SHALL render the following sections in this order: Header_Zone, Verdict_Zone, Match_Fitness_Tabs (populated with `experts_required`, `references_required`, and `turnover_required` fields), Details_Section, Documents section, and Developer_Section
3. WHEN a tender is in `fully_analyzed` state, THE Detail_Page SHALL render the following sections in this order: Header_Zone, Verdict_Zone, Match_Fitness_Tabs (populated with `team_requirements`, `team_match_result`, `reference_requirements`, `reference_match_result`, and `exclusion_result` fields), Details_Section, Documents section, and Developer_Section
4. IF a section's data prerequisites are all null for the current tender state, THEN THE Detail_Page SHALL omit that section entirely from the DOM — specifically: Verdict_Zone is omitted when `unified_score` is null; Match_Fitness_Tabs is omitted when all eligibility and extraction fields are null; Developer_Section is omitted when `analyzed_at` is null
5. THE Detail_Page SHALL NOT render Developer_Section for tenders in `unanalyzed` state

### Requirement 10: Information Relocation

**User Story:** As a user, I want information placed where it's most useful, so that I can find it without hunting through the page.

#### Acceptance Criteria

1. THE Detail_Page SHALL NOT render analysis tags within the Key Facts grid or any section below the Header_Zone — tags SHALL appear exclusively as pill-shaped badges within the Header_Zone
2. THE Detail_Page SHALL NOT render feedback controls (interesting/boring) as a standalone section between the Header_Zone and the content below it — feedback controls SHALL appear exclusively as icon buttons within the Header_Zone
3. THE Detail_Page SHALL NOT display a "Types" field (the `types` string) anywhere on the page, including the Key Facts grid and the Header_Zone
4. THE Detail_Page SHALL display the `tender_type` value in the Header_Zone using humanized labels: "request_to_participate" → "Request to Participate", "expression_of_interest" → "Expression of Interest", "full_proposal" → "Full Proposal"; IF `tender_type` is null, THEN THE Detail_Page SHALL omit the tender type element entirely
5. WHEN the tender's warnings array contains one or more entries, THE Detail_Page SHALL render a visually distinct banner (contrasting background color and border) above the Header_Zone, listing each warning as a separate line item — the banner SHALL be visible without scrolling when the page loads at the top
