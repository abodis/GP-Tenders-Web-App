---
inclusion: always
description: "Project conventions and standards"
keywords: ["conventions", "standards", "common"]
---

# Project Conventions

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 |
| Build tool | Vite 8 |
| Language | TypeScript 5.9 (strict) |
| Styling | Tailwind CSS 4 |
| Components | shadcn/ui (base-nova style) |
| Data fetching | TanStack Query v5 |
| Routing | React Router v6 |
| Testing | Vitest 4 + fast-check + @testing-library/react + msw |
| Hosting | S3 + CloudFront |

## Code Standards

- TypeScript strict mode — no `any` types
- Path alias: `@/*` maps to `src/*`
- All API calls go through `apiFetch` in `src/api/client.ts`
- Server state managed exclusively by TanStack Query — no Redux/Zustand
- UI state is local `useState` only
- Cursor-based pagination with "Load more" buttons (no page numbers)
- Client-side sorting only for fields the API doesn't support server-side

## Naming Conventions

- Files: kebab-case (e.g. `tender-list-page.tsx`) — exception: existing PascalCase page/component files
- Components: PascalCase
- Functions/hooks: camelCase
- Constants: UPPER_SNAKE_CASE
- Custom hooks: `use` prefix, one per file in `src/hooks/`

## Project Structure

```
src/
├── api/          # API client, endpoints, types
├── assets/       # Static assets (images, SVGs)
├── components/   # Shared UI components
│   └── ui/       # shadcn/ui primitives
├── hooks/        # TanStack Query custom hooks
├── layouts/      # App shell / layout components
├── lib/          # Utility libraries (cn, etc.)
├── pages/        # Route page components
├── test/         # Test setup
└── utils/        # Pure utility functions
```

## Anti-Patterns (grows via reflection)

- **Mismatched API return types**: `getSources()` is typed as `Promise<SourceListItem[]>` but the API actually returns a paginated wrapper `{items: [...]}`. The `useSources` hook normalizes this via `select`. When adding new endpoints, verify the actual response shape matches the TypeScript type.
- **Removing UI features instead of fixing data flow**: When list data is missing fields, check whether the API already provides them (or can trivially be updated to) before stripping columns from the UI.
- **Displaying structured data over human-readable notes**: When API fields include both numeric/structured data and a `notes` field, prefer showing notes as the primary visible content. The structured data (counts, amounts, years) should be secondary (tooltip/hover). Notes capture the human-readable requirement; numbers are for verification.
- **@base-ui/react import casing**: Subpath imports from `@base-ui/react` use lowercase module names (e.g. `@base-ui/react/tooltip`, `@base-ui/react/dialog`), not PascalCase. PascalCase paths will fail at build/test time with "not exported" errors.
