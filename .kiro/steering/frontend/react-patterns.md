---
inclusion: fileMatch
fileMatchPattern: "src/**/*.{ts,tsx}"
description: "React component and hook patterns for the RFP web app"
keywords: ["react", "components", "hooks", "patterns"]
---

# React Patterns

## Component Structure

- Pages live in `src/pages/` — one file per route
- Shared components in `src/components/` — reusable across pages
- shadcn/ui primitives in `src/components/ui/` — don't modify directly
- Layouts in `src/layouts/` — app shell, nav bar

## Data Fetching

- Every data-fetching concern gets its own hook in `src/hooks/`
- Use `useQuery` for single resources, `useInfiniteQuery` for paginated lists
- Query keys should be descriptive arrays: `['tenders', sourceId, tenderId]`
- Never call `apiFetch` directly from components — always go through a hook

## Hook Patterns

```typescript
// Paginated list pattern
export function useTenders(params: TenderListParams) {
  return useInfiniteQuery({
    queryKey: ['tenders', params],
    queryFn: ({ pageParam }) => getTenders({ ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  })
}

// Single resource pattern
export function useTenderDetail(sourceId: string, tenderId: string) {
  return useQuery({
    queryKey: ['tender', sourceId, tenderId],
    queryFn: () => getTenderDetail(sourceId, tenderId),
  })
}
```

## Mutations (PUT)

- Use `apiPut` from `src/api/client.ts` for write operations
- Wrap in `useMutation` from TanStack Query — never call `apiPut` directly from components
- On success, invalidate the relevant query key to refresh cached data
- Pattern: `useMutation({ mutationFn: (body) => putSetting(type, body), onSuccess: () => queryClient.invalidateQueries({ queryKey }) })`

## Error Handling in Components

- Use TanStack Query's `isError` / `error` for API errors
- Render `<ErrorAlert>` with the error message and a retry button
- For 404s, show a "not found" message with a back link
- Wrap the app in `<ErrorBoundary>` for unexpected render errors

## Shared Data Bugs

- When a data-shape bug appears in one consumer (e.g. `sources.map is not a function`), grep for ALL usages of that data across hooks and pages before fixing — the same bug likely exists in multiple places.

## Pagination

- Use "Load more" buttons, never page numbers
- `fetchNextPage` from `useInfiniteQuery` handles cursor forwarding
- Show inline loading on the button during fetch, not a full-page spinner

## Styling

- Tailwind utility classes — no custom CSS files
- Use `cn()` from `src/lib/utils.ts` for conditional class merging
- shadcn/ui components for all standard UI elements (buttons, tables, badges, etc.)

## shadcn/ui Components

- Installed primitives live in `src/components/ui/` — prefer these over native HTML elements for selects, buttons, etc.
- Install new components via `npx shadcn@latest add <component> --yes`
- Select component (base-nova / base-ui):
  - Always controlled: `<Select value={} onValueChange={}>`
  - **Critical**: Pass `items` prop to `<Select>` root with `{ value, label }[]` — without this, `<SelectValue>` renders the raw value string instead of the human-readable label
  - Use sentinel values like `'__all__'` for "no filter" since base-ui doesn't support empty string values
  - Set `min-w-[Npx]` on `<SelectTrigger>` to prevent narrow collapsed triggers
  - `<SelectContent>` popup uses `min-w-(--anchor-width)` so it can grow wider than the trigger
  - Select dropdown styling: default item padding was too tight. Project standard is `py-2 pl-2.5` on items, `p-1` on the popup container, and `rounded-md` on the popup (not `rounded-lg`). Already applied in `src/components/ui/select.tsx`.
  - Example: `<Select value={v} onValueChange={fn} items={[{ value: '__all__', label: 'All' }, ...]}>`
- Popover + native date input gotcha: A native `<input type="date">` inside a base-ui `Popover` closes the popover when the user clicks the OS calendar's month arrows — the native calendar renders in an OS-level layer outside the popover DOM, so base-ui fires `outside-press`/`focus-out`. Fix: control the popover (`open`/`onOpenChange`) and call `details.cancel()` on those reasons while `document.activeElement` is a `type="date"` input inside `[data-slot="popover-content"]`. Escape and genuine outside clicks still close it. See the Period popover in `TenderListPage.tsx`.
- Filter popover draft/Apply pattern: For popover filters that combine presets with free-form input (e.g. the Period date range in `TenderListPage.tsx`), hold a local draft (`useState`) seeded from the active filters when the popover opens. Presets and inputs write only to the draft; an explicit Apply button commits draft → URL filters and closes, and Clear empties the draft (Apply still required to commit). Avoid live `updateFilters` on every input change — partial ranges shouldn't filter the table mid-selection.
- base-ui Select "no preset match" display: To show a computed label like "Custom range" when the selected value matches no listed option, include it as a value in the Select `items` array (so `<SelectValue>` renders its label) but do NOT render it as a `<SelectItem>` (so it's display-only, not user-selectable).

## Verification

- Final checkpoint for UI features: run dev server + browser check against local backend (not just `tsc --noEmit` and `npm run build`)
- Confirm new sections render with live API data, interactive elements work (toggles, inputs), and conditional rendering handles missing data gracefully
