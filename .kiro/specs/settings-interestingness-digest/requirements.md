# Requirements Document

## Introduction

Add two new settings sections (`interestingness` and `digest`) to the existing Settings page. The backend API already supports these setting types via `PUT /settings/interestingness` and `PUT /settings/digest`, but the frontend only exposes 4 of 6 available setting types. Users currently cannot configure interestingness scoring behavior or email digest thresholds without direct API calls.

This feature follows the established Section/Card pattern used by the existing four settings sections: each section has its own save button, success indicator, and error display.

## Testing Strategy

- The backend runs locally during development — verification uses the real API, not mocks
- Verification is done via Playwright browser automation: navigate to Settings, interact with the new sections, confirm saves work end-to-end
- No unit or integration test suites for this feature — automated tests are a burden at this stage of product evolution
- Smoke-level Playwright checks (page loads, fields render, save round-trips) are the appropriate verification method

## Glossary

- **Settings_Page**: The existing settings page component (`src/pages/SettingsPage.tsx`) that displays configurable sections for the GPTenders pipeline
- **Interestingness_Section**: A new card section for configuring the interestingness scoring gate parameters
- **Digest_Section**: A new card section for configuring email digest display thresholds
- **Interest_Profile**: A free-text field (max 5000 characters) describing what types of tenders excite the team, fed to the LLM for interestingness scoring
- **Markdown_Preview**: A toggle view that renders the interest_profile text as formatted Markdown
- **Forbidden_Criteria**: The set of scoring criteria values ("sector fit", "geographic fit", "expertise match") that are reserved for the interestingness scorer and cannot appear in the analysis scoring_criteria list
- **Section**: The reusable card wrapper component providing title, description, save button, success indicator, and error display
- **useSettings_Hook**: The existing TanStack Query hook (`src/hooks/useSettings.ts`) that fetches and selects settings by type

## Requirements

### Requirement 1: Interestingness Section Display

**User Story:** As a user, I want to see an interestingness settings section on the Settings page, so that I can configure how the interestingness scorer evaluates tenders.

#### Acceptance Criteria

1. WHEN the Settings_Page loads and interestingness settings data is available, THE Interestingness_Section SHALL render as a card section displaying fields for interest_profile, interestingness_top_n, and interestingness_min_score, each pre-populated with the current saved values from the API response
2. THE Interestingness_Section SHALL follow the same Section/Card pattern as existing settings sections, including a title ("Interestingness"), description, a "scoring" badge, save button, success indicator, and error display area
3. WHEN the useSettings_Hook returns an interestingness property that is undefined or null, THE Settings_Page SHALL omit the Interestingness_Section from the layout
4. WHEN the Interestingness_Section renders, THE section SHALL display a last-saved timestamp from the settings data's updated_at field, consistent with the existing Section pattern

### Requirement 2: Interest Profile Field

**User Story:** As a user, I want to edit my team's interest profile as Markdown text with a preview toggle, so that I can describe what excites us in a readable format.

#### Acceptance Criteria

1. THE Interestingness_Section SHALL display the interest_profile field as a multi-line textarea
2. THE Interestingness_Section SHALL display a character counter showing the current character count out of a 5000 character maximum, and SHALL prevent further text input once the 5000 character limit is reached
3. WHEN the user toggles the Markdown_Preview, THE Interestingness_Section SHALL render the interest_profile text as formatted Markdown and SHALL visually indicate that Preview mode is active
4. WHEN the user toggles back from Markdown_Preview to edit mode, THE Interestingness_Section SHALL display the raw textarea with the current content preserved and SHALL visually indicate that Edit mode is active

### Requirement 3: Interestingness Numeric Fields

**User Story:** As a user, I want to configure how many tenders pass the interestingness gate and the minimum score threshold, so that I can control the scoring pipeline volume.

#### Acceptance Criteria

1. THE Interestingness_Section SHALL display the interestingness_top_n field as a numeric input restricted to integers with a minimum value of 1 and maximum value of 1000, showing the current saved value on load
2. THE Interestingness_Section SHALL display the interestingness_min_score field as a numeric input restricted to integers with a minimum value of 1 and maximum value of 10, showing the current saved value on load
3. IF the user submits a value outside the valid range, a non-integer value, or an empty value for interestingness_top_n or interestingness_min_score, THEN THE Interestingness_Section SHALL display a field-level error message indicating the valid range and that the value must be a whole number, and SHALL NOT send the save request to the API

### Requirement 4: Interestingness Section Save

**User Story:** As a user, I want to save my interestingness settings with validation feedback, so that I know the configuration was applied.

#### Acceptance Criteria

1. WHEN the user clicks the save button, THE Interestingness_Section SHALL validate all fields (interest_profile, interestingness_top_n, interestingness_min_score) before submitting
2. IF interest_profile is empty or contains only whitespace, THEN THE Interestingness_Section SHALL display a field-level error and prevent submission
3. IF interest_profile exceeds 5000 characters, THEN THE Interestingness_Section SHALL display a field-level error and prevent submission
4. IF interestingness_top_n is not a whole number in the range 1–1000, THEN THE Interestingness_Section SHALL display a field-level error and prevent submission
5. IF interestingness_min_score is not a whole number in the range 1–10, THEN THE Interestingness_Section SHALL display a field-level error and prevent submission
6. WHILE a PUT request is in progress, THE Interestingness_Section SHALL disable the save button and display a loading label
7. WHEN validation passes, THE Interestingness_Section SHALL send a PUT request to `/settings/interestingness` with the current field values
8. WHEN the PUT request succeeds, THE Interestingness_Section SHALL display a success indicator
9. IF the PUT request fails, THEN THE Interestingness_Section SHALL display the error message from the response below the form fields

### Requirement 5: Digest Section Display

**User Story:** As a user, I want to see a digest settings section on the Settings page, so that I can configure how the email digest categorizes tenders by score.

#### Acceptance Criteria

1. WHEN the Settings_Page loads and digest settings data is present, THE Digest_Section SHALL render as a card section displaying numeric input fields for score_threshold_top (integer, range 1–10), score_threshold_floor (integer, range 1–10), max_worth_a_look (positive integer, range 1–1000), and max_excluded_shown (positive integer, range 1–1000), each populated with the current backend values
2. THE Digest_Section SHALL follow the same Section/Card pattern as existing settings sections, including a title, description, save button, success indicator, and error display area
3. WHEN the backend returns no digest setting in the settings list response, THE Settings_Page SHALL omit the Digest_Section from the layout entirely
4. IF the user attempts to save with score_threshold_top less than or equal to score_threshold_floor, THEN THE Digest_Section SHALL display a field-level error message indicating that the top threshold must be greater than the floor threshold, and SHALL NOT submit the request to the backend
5. IF any field value is outside its valid range or is not a positive integer, THEN THE Digest_Section SHALL display a field-level error message on the invalid field and SHALL NOT submit the request to the backend

### Requirement 6: Digest Numeric Fields

**User Story:** As a user, I want to configure digest score thresholds and section limits, so that I can control which tenders appear in each email digest section.

#### Acceptance Criteria

1. THE Digest_Section SHALL display score_threshold_top as a numeric input accepting values from 0 to 10 with a step of 0.1 (1 decimal place precision)
2. THE Digest_Section SHALL display score_threshold_floor as a numeric input accepting values from 0 to 10 with a step of 0.1 (1 decimal place precision)
3. THE Digest_Section SHALL display max_worth_a_look as a numeric input accepting integer values from 1 to 1000
4. THE Digest_Section SHALL display max_excluded_shown as a numeric input accepting integer values from 1 to 1000
5. IF the user sets score_threshold_top to a value less than score_threshold_floor, THEN THE Digest_Section SHALL display a validation error indicating that the top threshold must be greater than or equal to the floor threshold
6. IF the user enters a value outside the accepted range for any numeric field, THEN THE Digest_Section SHALL prevent submission and display the field as invalid

### Requirement 7: Digest Section Save with Cross-Field Validation

**User Story:** As a user, I want the digest section to enforce that the top threshold exceeds the floor threshold, so that the scoring tiers are logically consistent.

#### Acceptance Criteria

1. WHEN the user clicks the save button, THE Digest_Section SHALL validate score_threshold_top, score_threshold_floor, max_worth_a_look, and max_excluded_shown before submitting
2. IF score_threshold_top is less than 0 or greater than 10, OR score_threshold_floor is less than 0 or greater than 10, THEN THE Digest_Section SHALL display a field-level error on the offending field indicating the accepted range is 0 to 10, and prevent submission
3. IF score_threshold_top is less than or equal to score_threshold_floor, THEN THE Digest_Section SHALL display a field-level error on the score_threshold_top field indicating that the top threshold must exceed the floor threshold, and prevent submission
4. IF max_worth_a_look is less than 1 or greater than 1000, THEN THE Digest_Section SHALL display a field-level error on max_worth_a_look indicating the accepted range is 1 to 1000, and prevent submission
5. IF max_excluded_shown is less than 1 or greater than 1000, THEN THE Digest_Section SHALL display a field-level error on max_excluded_shown indicating the accepted range is 1 to 1000, and prevent submission
6. WHEN validation passes, THE Digest_Section SHALL send a PUT request to `/settings/digest` with a JSON body containing score_threshold_top, score_threshold_floor, max_worth_a_look, and max_excluded_shown
7. WHEN the PUT request succeeds, THE Digest_Section SHALL display a success indicator that remains visible until the user modifies a field value
8. IF the PUT request fails, THEN THE Digest_Section SHALL display the error message from the response body, or a generic failure message if no message field is present in the response

### Requirement 8: Forbidden Scoring Criteria Validation

**User Story:** As a user, I want the analysis section to reject forbidden scoring criteria values, so that I don't accidentally duplicate functionality handled by the interestingness scorer.

#### Acceptance Criteria

1. WHEN the user saves the analysis section with a scoring_criteria entry whose trimmed, case-insensitive value matches any Forbidden_Criteria value, THEN THE AnalysisSection SHALL display a field-level error on the scoring criteria field identifying each forbidden value by name and prevent submission until all forbidden values are removed
2. THE AnalysisSection SHALL treat the following values as Forbidden_Criteria: "sector fit", "geographic fit", "expertise match"
3. WHEN the scoring_criteria list contains both valid and forbidden entries, THEN THE AnalysisSection SHALL identify only the forbidden entries in the error message and leave valid entries unchanged in the input
4. IF the user removes or edits the forbidden entry so it no longer matches any Forbidden_Criteria value (trimmed, case-insensitive), THEN THE AnalysisSection SHALL clear the field-level error on the next save attempt

### Requirement 9: Type and Hook Integration

**User Story:** As a developer, I want the interestingness and digest types added to the API types and useSettings hook, so that the new sections receive data through the established data-fetching pattern.

#### Acceptance Criteria

1. THE SettingType union SHALL include 'interestingness' and 'digest' as valid values alongside the existing 'selection-criteria', 'analysis', 'company-profile', and 'recipients' values
2. WHEN the API response contains an item with setting_type 'interestingness', THE useSettings hook select function SHALL map it to an InterestingnessSettings typed value containing the fields: setting_type (literal 'interestingness'), updated_at (string), interest_profile (string, max 5000 characters), scoring_criteria (string array), interestingness_top_n (number, range 1–1000), and interestingness_min_score (number, range 1–10)
3. WHEN the API response contains an item with setting_type 'digest', THE useSettings hook select function SHALL map it to a DigestSettings typed value containing the fields: setting_type (literal 'digest'), updated_at (string), score_threshold_top (number), score_threshold_floor (number), max_worth_a_look (number, positive integer), and max_excluded_shown (number, positive integer)
4. THE SettingResponse union type SHALL include InterestingnessSettings and DigestSettings in addition to the existing SelectionCriteriaSettings, AnalysisSettings, CompanyProfileSettings, and RecipientsSettings
5. WHEN the API response contains no item with setting_type 'interestingness' or 'digest', THE useSettings hook select function SHALL return undefined for the corresponding property in the result object
6. THE useSettings hook result object SHALL expose the interestingness setting under an 'interestingness' property and the digest setting under a 'digest' property, matching the existing pattern used for selectionCriteria, analysis, companyProfile, and recipients

### Requirement 10: Settings Page Section Ordering

**User Story:** As a user, I want the new settings sections positioned logically on the page, so that related pipeline configuration is grouped together.

#### Acceptance Criteria

1. THE Settings_Page SHALL display sections in this order from top to bottom: Selection Criteria, Analysis, Interestingness, Company Profile, Recipients, Digest
2. THE Settings_Page SHALL display the Interestingness_Section immediately after the Analysis section with no other sections between them
3. THE Settings_Page SHALL display the Digest_Section immediately after the Recipients section with no other sections between them
4. THE Settings_Page header description text SHALL include the terms "interestingness scoring" and "email digest" in addition to the existing setting areas
