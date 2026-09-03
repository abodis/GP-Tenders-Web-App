# Requirements Document

## Introduction

Reorganize the tender detail page (`TenderDetailPage.tsx`) from a flat vertical layout of 12+ equally-weighted sections into a three-tier information hierarchy:
1. **"Should I keep reading?"** — Title, organization, prominent relevance score, key facts, AI assessment
2. **"Can we bid?"** — Eligibility requirements (consolidated, notes-primary), description, documents
3. **"System details"** — Scraper metadata, run links, analysis fields (collapsed by default)

This is a presentational restructure only. No new API calls or routes are introduced. Existing hooks (`useTenderDetail`, `useTenderDocuments`) are unchanged.

## Glossary

- **Detail_Page**: The `TenderDetailPage` component at route `/tenders/:sourceId/:tenderId`
- **Header_Section**: Top area displaying title, organization, relevance score visual, and status badge
- **Key_Facts_Grid**: Grid of primary tender metadata (deadline, location, budget, etc.)
- **AI_Assessment_Section**: Section showing analysis context and summary from the LLM
- **Eligibility_Section**: Consolidated section for experts, references, and turnover requirements
- **Description_Section**: Collapsible section showing the tender's raw description text
- **Documents_Section**: Table of downloadable tender documents
- **System_Info_Section**: Collapsible section showing scraper metadata and run links
- **RelevanceScoreVisual**: A large, prominent score display replacing the small `ScoreBadge` in the header

## Requirements

### Requirement 1: Header Section with Prominent Score

**User Story:** As a Green Partners employee, I want to see the tender title, organization, and relevance score prominently at the top, so that I can immediately gauge whether this tender is worth evaluating.

#### Acceptance Criteria

1. THE Header_Section SHALL display the tender title as the primary `h1` heading
2. THE Header_Section SHALL display the organization name directly below or beside the title
3. THE Header_Section SHALL display a large colored RelevanceScoreVisual showing the `relevance_score` value with color coding: green for 7–10, yellow for 4–6, red for 1–3, gray for null or 0
4. THE Header_Section SHALL display the `StatusBadge` with `status_name` when available
5. THE Header_Section SHALL de-emphasize source_id and tender_id (smaller text, muted color)

### Requirement 2: Key Facts Grid

**User Story:** As a Green Partners employee, I want key facts organized in a scannable grid below the header, so that I can see deadline, budget, and location without reading through paragraphs.

#### Acceptance Criteria

1. THE Key_Facts_Grid SHALL render immediately below the Header_Section
2. THE Key_Facts_Grid SHALL display: deadline, location, budget (formatted with EUR currency), tender_type (humanized), source link
3. THE Key_Facts_Grid SHALL display tags as subtle pill badges when `analysis_tags` is non-empty
4. WHEN a field value is null, THE Key_Facts_Grid SHALL display "—" as a placeholder

### Requirement 3: AI Assessment Section

**User Story:** As a Green Partners employee, I want the AI's assessment displayed before eligibility details, so that I get the machine's verdict before diving into specifics.

#### Acceptance Criteria

1. THE AI_Assessment_Section SHALL render after Key_Facts_Grid and before the Eligibility_Section
2. THE AI_Assessment_Section SHALL display `analysis_context` (fit analysis) as primary content
3. THE AI_Assessment_Section SHALL display `analysis_summary` below the fit analysis
4. WHEN `analysis_context` is null, THE AI_Assessment_Section SHALL display only `analysis_summary`
5. WHEN both `analysis_context` and `analysis_summary` are null, THE AI_Assessment_Section SHALL NOT render

### Requirement 4: Eligibility Section with Notes-Primary Pattern

**User Story:** As a Green Partners employee, I want eligibility requirements (experts, references, turnover) consolidated in one section with human-readable notes as the primary content, so that I can quickly assess bid eligibility.

#### Acceptance Criteria

1. THE Eligibility_Section SHALL consolidate experts_required, references_required, and turnover_required into sub-groups within a single section
2. THE Eligibility_Section SHALL be rendered after the AI_Assessment_Section
3. WHEN a sub-group's `notes` field is present, THE Eligibility_Section SHALL display notes as the primary visible content with structured numeric data available via an info tooltip
4. WHEN a sub-group's `notes` field is null, THE Eligibility_Section SHALL display the structured numeric data inline as fallback
5. THE Eligibility_Section SHALL format monetary values (`value_eur`, `annual_eur`) in EUR currency format
6. WHEN a sub-group's corresponding field is entirely null, THE Eligibility_Section SHALL omit that sub-group
7. WHEN all three requirement fields are null, THE Eligibility_Section SHALL NOT render

### Requirement 5: Collapsible Description Section

**User Story:** As a Green Partners employee, I want the raw tender description collapsed by default when AI assessment exists, so that boilerplate text doesn't push important content below the fold.

#### Acceptance Criteria

1. THE Description_Section SHALL display a preview of 4–6 lines by default with a "Show full description" toggle
2. WHEN the user activates "Show full description", THE Description_Section SHALL expand to show the complete `description_text`
3. WHEN expanded, THE Description_Section SHALL display a "Show less" toggle to collapse back to preview
4. THE Description_Section SHALL preserve formatting and line breaks from the source text
5. WHEN `description_text` is null, THE Description_Section SHALL NOT render

### Requirement 6: Documents Section

**User Story:** As a Green Partners employee, I want to see and download tender documents in a clear list, so that I can access the full tender package.

#### Acceptance Criteria

1. THE Documents_Section SHALL display documents in a table/list with filename, size (formatted as KB/MB), and a download link
2. THE Documents_Section SHALL display each document's presigned URL as the download action
3. WHEN no documents are available, THE Documents_Section SHALL display "No documents available"
4. WHILE documents are loading, THE Documents_Section SHALL display a loading spinner
5. IF the documents API returns an error, THE Documents_Section SHALL display an error message with a retry option

### Requirement 7: Collapsible System Info Section

**User Story:** As a developer, I want system metadata accessible but hidden by default, so that ops details don't clutter the primary evaluation view.

#### Acceptance Criteria

1. THE System_Info_Section SHALL render collapsed by default
2. THE System_Info_Section SHALL be rendered at the bottom of the page, after the Documents_Section
3. WHEN expanded, THE System_Info_Section SHALL display: scraper status, retry_count, last_attempt, last_error, documents_downloaded, documents_failed, skip_reason, discovery run ID (linked), processing run ID (linked), analysis_model, analyzed_at, emailed_at, source_id, tender_id
4. THE System_Info_Section SHALL contain a toggle to expand/collapse
5. WHEN a metadata field is null, THE System_Info_Section SHALL display "—" as a placeholder

### Requirement 8: Section Ordering

**User Story:** As a Green Partners employee, I want the page sections ordered by decision-relevance, so that I can evaluate tenders top-to-bottom without jumping around.

#### Acceptance Criteria

1. THE Detail_Page SHALL render sections in this order: Header_Section → Key_Facts_Grid → AI_Assessment_Section → Eligibility_Section → Description_Section → Documents_Section → System_Info_Section
2. WHEN warnings exist on the tender, THE Detail_Page SHALL display a warnings banner above the Header_Section
