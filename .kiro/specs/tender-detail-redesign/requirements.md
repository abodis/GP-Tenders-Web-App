# Requirements Document

## Introduction

Redesign the tender detail page (`TenderDetailPage.tsx`) to reorganize information from the perspective of a Green Partners employee evaluating tenders for bid/no-bid decisions. The current layout is flat and gives scraper/system metadata too much prominence. The new layout uses a three-tier information hierarchy: "Should I keep reading?" → "Can we bid?" → "System details", matching the company profile's UX priorities.

## Glossary

- **Detail_Page**: The `TenderDetailPage` component that renders a single tender's full information at route `/tenders/:sourceId/:tenderId`
- **Header_Section**: The topmost area of the Detail_Page containing the tender title, organization, relevance score, status badge, and de-emphasized identifiers
- **Key_Facts_Grid**: A card/grid layout displaying budget, deadline, location, tender type, posted date, sectors, types, and tags
- **AI_Assessment_Section**: The section displaying the AI-generated context (fit analysis for Green Partners) and summary
- **Eligibility_Section**: A consolidated section grouping experts required, references required, and turnover required into sub-groups
- **Description_Section**: The collapsible section showing the tender's full description text
- **Documents_Section**: The table listing downloadable tender documents
- **System_Info_Section**: A collapsible section (collapsed by default) containing scraper metadata, run links, and analysis system fields
- **Relevance_Score_Visual**: A prominent, large colored visual element displaying the relevance score in the header area
- **Collapse_Toggle**: A clickable control that expands or collapses a content section

## Requirements

### Requirement 1: Header Section Layout

**User Story:** As a Green Partners employee, I want to see the tender title, organization, relevance score, and status at the top of the page, so that I can immediately assess whether this tender is worth evaluating further.

#### Acceptance Criteria

1. THE Detail_Page SHALL display the tender title as the primary heading in the Header_Section
2. THE Header_Section SHALL display the organization name directly below or beside the title
3. THE Header_Section SHALL display the Relevance_Score_Visual as a large colored element using green for scores 7–10, yellow for scores 4–6, red for scores 1–3, and gray for null or zero
4. THE Header_Section SHALL display the status_name as a human-readable badge (e.g. "Active", "Closed") when status_name is available
5. THE Header_Section SHALL display the source_id and tender_id in a de-emphasized style (smaller text, muted color)
6. WHEN warnings exist on the tender, THE Detail_Page SHALL display a warnings banner above the Header_Section

### Requirement 2: Key Facts Grid

**User Story:** As a Green Partners employee, I want to see budget, deadline, location, and other key facts in a scannable grid, so that I can quickly assess the tender's basic parameters.

#### Acceptance Criteria

1. THE Detail_Page SHALL display a Key_Facts_Grid immediately below the Header_Section
2. THE Key_Facts_Grid SHALL display: Budget, Deadline, Location, Tender Type, Posted Date, Sectors, Types, and Tags
3. THE Key_Facts_Grid SHALL format the budget as EUR currency using the existing `formatBudget` utility
4. WHEN a field value is null or empty, THE Key_Facts_Grid SHALL display a dash ("—") placeholder
5. THE Key_Facts_Grid SHALL display tags as pill-shaped badges when analysis_tags are present

### Requirement 3: AI Assessment Section

**User Story:** As a Green Partners employee, I want to see the AI's fit analysis for Green Partners before the general summary, so that I can quickly understand how relevant this tender is to our capabilities.

#### Acceptance Criteria

1. THE Detail_Page SHALL display the AI_Assessment_Section below the Key_Facts_Grid
2. THE AI_Assessment_Section SHALL display the analysis_context (fit analysis) before the analysis_summary
3. THE AI_Assessment_Section SHALL display the analysis_model and analyzed_at as tooltips or subtle inline metadata near the section heading
4. WHEN analysis_context is null, THE AI_Assessment_Section SHALL omit the context block
5. WHEN analysis_summary is null, THE AI_Assessment_Section SHALL omit the summary block
6. WHEN both analysis_context and analysis_summary are null, THE Detail_Page SHALL omit the AI_Assessment_Section entirely

### Requirement 4: Eligibility Requirements Section

**User Story:** As a Green Partners employee, I want to see all eligibility requirements (experts, references, turnover) in one consolidated section with notes prominently displayed and numeric details available on hover, so that I can quickly assess whether we qualify to bid without visual clutter.

#### Acceptance Criteria

1. THE Detail_Page SHALL display the Eligibility_Section below the AI_Assessment_Section
2. THE Eligibility_Section SHALL group experts_required, references_required, and turnover_required as labeled sub-groups within a single section
3. EACH sub-group SHALL display the notes field as the primary visible content, since notes contain the human-readable requirement description
4. EACH sub-group SHALL display the structured numeric data (e.g. international, local, key_experts, total, count, type, value_eur, timeline_years, annual_eur, years) behind an info icon that reveals the data on hover via a tooltip or popover
5. WHEN a sub-group has no notes value, THE sub-group SHALL fall back to displaying the structured numeric data inline instead
6. WHEN experts_required is null, THE Eligibility_Section SHALL omit the experts sub-group
7. WHEN references_required is null, THE Eligibility_Section SHALL omit the references sub-group
8. WHEN turnover_required is null, THE Eligibility_Section SHALL omit the turnover sub-group
9. WHEN all three requirement fields are null, THE Detail_Page SHALL omit the Eligibility_Section entirely
10. THE Eligibility_Section SHALL format monetary values (value_eur, annual_eur) as EUR currency in both the tooltip and any inline fallback display

### Requirement 5: Collapsible Description

**User Story:** As a Green Partners employee, I want the description to show a short preview with an option to expand, so that long descriptions do not dominate the page when I am scanning.

#### Acceptance Criteria

1. THE Description_Section SHALL display the first 4–6 lines of description_text as a visible preview
2. THE Description_Section SHALL display a Collapse_Toggle labeled "Show full description" below the preview when the description exceeds the preview length
3. WHEN the user activates the Collapse_Toggle, THE Description_Section SHALL expand to show the full description_text
4. WHEN the description is expanded, THE Collapse_Toggle SHALL change its label to "Show less"
5. WHEN description_text is null, THE Detail_Page SHALL omit the Description_Section entirely

### Requirement 6: Documents Table

**User Story:** As a Green Partners employee, I want to see and download tender documents, so that I can review the full tender package.

#### Acceptance Criteria

1. THE Detail_Page SHALL display the Documents_Section below the Description_Section
2. THE Documents_Section SHALL display documents in a table with columns: Filename, Size, Download
3. WHEN no documents are available, THE Documents_Section SHALL display "No documents available"
4. WHEN the documents API is loading, THE Documents_Section SHALL display a loading spinner
5. IF the documents API returns an error, THEN THE Documents_Section SHALL display an error message with a retry button

### Requirement 7: Collapsible System Info

**User Story:** As a Green Partners employee, I want scraper and system metadata hidden by default but accessible when needed, so that technical details do not clutter my evaluation workflow.

#### Acceptance Criteria

1. THE Detail_Page SHALL display the System_Info_Section as the last section on the page
2. THE System_Info_Section SHALL be collapsed by default
3. THE System_Info_Section SHALL contain: scraper status, retry_count, last_attempt, last_error, documents_downloaded, documents_failed, skip_reason, discovery run link, processing run link, analysis_model, analyzed_at, emailed_at, source_id, and tender_id
4. WHEN the user activates the System_Info_Section Collapse_Toggle, THE System_Info_Section SHALL expand to reveal all system metadata fields
5. WHEN a system metadata field value is null, THE System_Info_Section SHALL display a dash ("—") placeholder

### Requirement 8: Section Ordering

**User Story:** As a Green Partners employee, I want information ordered by decision-making priority, so that the most important evaluation data appears first.

#### Acceptance Criteria

1. THE Detail_Page SHALL render sections in this order: Warnings (if any), Header_Section, Key_Facts_Grid, AI_Assessment_Section, Eligibility_Section, Description_Section, Documents_Section, System_Info_Section
