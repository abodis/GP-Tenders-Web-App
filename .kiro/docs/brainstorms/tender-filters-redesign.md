# Tender Filters Redesign Brainstorm

## What We're Building
Polish the tenders filter bar to look more presentable while keeping filters prominent and always visible (no modals/drawers).

## Key Decisions Made
- **Layout approach**: Grouped inline bar with visual sections (🟢 80%) — subtle vertical dividers between logical groups, consistent styling across all controls
- **Date inputs**: Style native `<input type="date">` to match shadcn selects (🟢 75%) — presets handle 90% of use; manual inputs are a power-user escape hatch
- **Active filter feedback**: "Clear filters" link + visual cue on active selects (🟢 80%) — clears by navigating to `/tenders` (reset all URL params)
- **Labels**: Keep labels above all controls for clarity — add labels to selects to match the existing From/To pattern
- **Grouping style**: Subtle vertical divider lines between logical filter groups
- **Clear behavior**: Navigate to `/tenders` to clear everything

## Constraints Discovered
- base-ui Select leaks sentinel values (`__all__`, `__clear__`) into a11y tree as hidden textboxes
- Native date inputs need visual alignment with shadcn select triggers (height, border, radius, focus ring)
- Only 5 filters currently — no need for collapsible/overflow patterns

## Integration Points
- `TenderListPage.tsx` — filter bar JSX + styles (primary change)
- `lucide-react` — icons for filter labels (CalendarDays, Filter, Database, BarChart3)
- No new shadcn components needed

## Filter Groups (with dividers)
1. **Date group**: Date preset select + From input + To input
2. **Filter group**: Status select + Source select + Analyzed select

## Open Questions
- [x] Labels above all controls? → Yes, for clarity
- [x] Grouping style? → Subtle vertical divider lines
- [x] Clear filters behavior? → Navigate to `/tenders`
