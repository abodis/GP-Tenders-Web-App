# Requirements Document

## Introduction

Compact and simplify the tender detail header and verdict zones. The header zone gains a condensed single-line metadata row with dot separators, moves feedback controls below the score badge, and drops analysis tags. The verdict zone loses its duplicated score badge, retaining only factor bars and AI summary text.

## Glossary

- **Header_Zone**: The top section of the tender detail view (`header-zone.tsx`) displaying the score badge, title, metadata, and actions.
- **Verdict_Zone**: The analysis section (`verdict-zone.tsx`) displaying factor bars and AI summary text.
- **Score_Badge**: A colored pill showing the tender's unified score.
- **Metadata_Row**: A single inline text row showing organization, tender type, deadline, and location separated by dot characters.
- **Feedback_Buttons**: Thumbs-up/thumbs-down controls for marking a tender as interesting or boring.
- **Factor_Bars**: Horizontal progress bars representing team match, reference match, and exclusion scores.
- **Actions_Dropdown**: The dropdown menu for additional tender actions (e.g., view source link).

## Requirements

### Requirement 1: Condensed Metadata Row

**User Story:** As a user reviewing a tender, I want the organization, tender type, deadline, and location displayed on a single line with dot separators, so that I can scan metadata quickly without excessive vertical space.

#### Acceptance Criteria

1. WHEN the Header_Zone renders, THE Header_Zone SHALL display organization, tender type, formatted deadline, and location as a single inline text row separated by middle-dot characters (` · `).
2. THE Header_Zone SHALL render the Metadata_Row text using a foreground color that provides readable contrast (not light gray/muted), matching the `text-foreground` or `text-gray-700` tone.
3. IF the organization value is null, THEN THE Header_Zone SHALL display "Unknown organization" in the Metadata_Row segment for organization.
4. IF the tender type value is null, THEN THE Header_Zone SHALL omit the tender type segment and its preceding dot separator from the Metadata_Row.
5. IF the location value is null, THEN THE Header_Zone SHALL omit the location segment and its preceding dot separator from the Metadata_Row.

### Requirement 2: Score Badge with Feedback Below

**User Story:** As a user, I want the feedback thumbs positioned directly below the score badge in the header's left column, so that score and feedback are visually grouped together.

#### Acceptance Criteria

1. THE Header_Zone SHALL render the Score_Badge in the left column of the header layout.
2. THE Header_Zone SHALL render the Feedback_Buttons directly below the Score_Badge within the same left column.
3. THE Header_Zone SHALL remove the Feedback_Buttons from the right column actions row.

### Requirement 3: Remove Analysis Tags

**User Story:** As a user, I want the AI-generated analysis tags removed from the header zone, so that the header stays compact and only shows actionable information.

#### Acceptance Criteria

1. THE Header_Zone SHALL NOT render analysis tag badges.
2. THE Header_Zone SHALL not import or reference the Badge component for analysis tags.

### Requirement 4: Verdict Zone Without Score Badge

**User Story:** As a user, I want the verdict zone to show only factor bars and the AI summary without a duplicated score badge, so that the score appears once (in the header) and the verdict zone focuses on detailed breakdown.

#### Acceptance Criteria

1. THE Verdict_Zone SHALL render Factor_Bars (team match, reference match, exclusion) without a preceding Score_Badge.
2. THE Verdict_Zone SHALL continue to render the AI summary text (analysis_context, analysis_summary, or interestingness_reasoning) in the right column.
3. THE Verdict_Zone SHALL NOT import or render the ScoreBadge component.

### Requirement 5: Actions Dropdown Retained

**User Story:** As a user, I want the actions dropdown (with the source link) to remain accessible in the header zone, so that I can still perform actions on the tender.

#### Acceptance Criteria

1. THE Header_Zone SHALL render the Actions_Dropdown in the right column of the header.
