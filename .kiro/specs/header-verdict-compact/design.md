# Design Document

## Overview

This feature refactors two existing components (`header-zone.tsx` and `verdict-zone.tsx`) to produce a more compact tender detail layout. No new files are created. The changes involve:

1. Replacing multi-line metadata with a single-line dot-separated row
2. Moving FeedbackButtons below the ScoreBadge in the left column
3. Removing analysis tag badges from the header
4. Removing the duplicated ScoreBadge from the verdict zone

## Architecture

No architectural changes. Both components remain pure presentational React components receiving props from their parent page. The data flow is unchanged — `TenderDetailResponse` feeds both zones.

## Component Changes

### HeaderZone (`src/components/tender-detail/header-zone.tsx`)

**Current structure:**
```
┌─────────────────────────────────────────┐
│ [ScoreBadge]  │  Title                  │
│               │  Organization (muted)   │
│               │  Tender type (muted)    │
│               │  Deadline · Location    │
│               │  [Tags...]              │
│               │  [Feedback] [Actions]   │
└─────────────────────────────────────────┘
```

**New structure:**
```
┌─────────────────────────────────────────┐
│ [ScoreBadge]  │  Title                  │
│ [Feedback]    │  Org · Type · Date · Loc│
│               │  [Actions]              │
└─────────────────────────────────────────┘
```

**Changes:**

1. **Left column** — Add `FeedbackButtons` below `ScoreBadge`.
2. **Metadata row** — Replace multi-line org/type/deadline/location with a single `<p>` using `buildMetadataRow()` helper that joins non-null segments with ` · `.
3. **Remove tags** — Delete the `analysis_tags` rendering block and remove the `Badge` import.
4. **Actions row** — Keep `ActionsDropdown` alone (feedback moved to left column).
5. **Remove "View on source" link** — This is handled by ActionsDropdown already.

**Helper function:**

```typescript
function buildMetadataRow(tender: TenderDetailResponse): string {
  const tenderType = humanizeTenderType(tender.tender_type)
  const segments: string[] = [
    tender.organization ?? 'Unknown organization',
    ...(tenderType ? [tenderType] : []),
    formatDeadline(tender.deadline),
    ...(tender.location_names ? [tender.location_names] : []),
  ]
  return segments.join(' · ')
}
```

### VerdictZone (`src/components/tender-detail/verdict-zone.tsx`)

**Changes:**

1. Remove `ScoreBadge` import and rendering.
2. Remove `showScore` variable.
3. Factor bars render directly at the top of the left column.

## Interfaces

No interface changes. Both components consume the existing `TenderDetailResponse` type and existing sub-component props (`ScoreBadgeProps`, `FeedbackButtonsProps`, `ActionsDropdownProps`).

## Data Models

No data model changes. The `TenderDetailResponse` type remains the single source of truth.

## Error Handling

No new error states. Null-handling for metadata fields (organization, tender_type, location_names) is addressed by the `buildMetadataRow` function which conditionally includes or excludes segments.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Metadata row contains all non-null fields joined by dot separators

*For any* `TenderDetailResponse` object, the metadata row string produced by `buildMetadataRow` SHALL contain exactly the non-null metadata segments (organization or "Unknown organization", tender type if non-null, formatted deadline, location if non-null) joined by ` · `, with no leading/trailing separators and no empty segments.

**Validates: Requirements 1.1, 1.3, 1.4, 1.5**

### Property 2: Analysis tags never rendered in HeaderZone

*For any* `TenderDetailResponse` (including those with non-empty `analysis_tags` arrays), the rendered HeaderZone output SHALL NOT contain Badge elements for analysis tags.

**Validates: Requirements 3.1**

### Property 3: ScoreBadge absent from VerdictZone

*For any* `TenderDetailResponse` (including those with non-null, non-zero `unified_score`), the rendered VerdictZone output SHALL NOT contain a ScoreBadge component.

**Validates: Requirements 4.1, 4.3**

### Property 4: AI summary cascade renders appropriate text

*For any* `TenderDetailResponse` with at least one non-null AI text field (`analysis_context`, `analysis_summary`, or `interestingness_reasoning`), the VerdictZone SHALL render the highest-priority available text following the cascade: `analysis_context` > `analysis_summary` > `interestingness_reasoning`.

**Validates: Requirements 4.2**
