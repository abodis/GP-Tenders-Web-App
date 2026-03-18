---
inclusion: fileMatch
fileMatchPattern: "src/**/*.test.{ts,tsx}"
description: "Testing patterns for Vitest, fast-check, and testing-library"
keywords: ["testing", "vitest", "fast-check", "property-based"]
---

# Testing Patterns

## Test Runner

- Vitest with jsdom environment
- Setup file: `src/test/setup.ts`
- Run: `npm run test` (vitest --run, single execution)

## Property-Based Tests (fast-check)

- Each correctness property from the design doc maps to one `fc.assert(fc.property(...))` test
- Minimum 100 iterations per property
- Tag each test with a comment: `// Feature: rfp-web-v1, Property N: description`
- Use custom arbitraries for domain types (TenderListItem, RunListItem, etc.)

```typescript
import fc from 'fast-check'

// Feature: rfp-web-v1, Property 5: Runs sorted by date descending
it('should sort runs by date descending after merge', () => {
  fc.assert(
    fc.property(fc.array(runListItemArbitrary()), (runs) => {
      const sorted = sortRunsByDate(runs)
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i - 1].started_at >= sorted[i].started_at).toBe(true)
      }
    }),
    { numRuns: 100 }
  )
})
```

## Component Tests (@testing-library/react)

- Use `render()` + `screen.getByRole()` / `screen.getByText()` for queries
- Prefer accessible queries (role, label) over test IDs
- Mock API responses with msw handlers
- Wrap components in necessary providers (QueryClientProvider, MemoryRouter)

## API Mocking (msw)

- Define handlers per test or in shared fixtures
- Use `setupServer` for Vitest (not `setupWorker`)
- Match on URL path and method, return typed JSON responses

## File Organization

- Test files live next to source: `component.tsx` → `component.test.tsx`
- Utility tests: `src/utils/formatting.test.ts`
- API tests: `src/api/client.test.ts`
