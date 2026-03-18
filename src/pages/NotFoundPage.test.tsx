import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom'
import NotFoundPage from './NotFoundPage'

// Feature: rfp-web-v1, Property 4: Undefined routes show 404 page
// **Validates: Requirements 3.4**

/**
 * Renders the app route configuration inside a MemoryRouter at the given path.
 * Mirrors the route structure from App.tsx without BrowserRouter or QueryClientProvider
 * (neither is needed to test routing behavior).
 */
function renderAtPath(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route index element={<Navigate to="/tenders" replace />} />
        <Route path="tenders" element={<div>Tenders</div>} />
        <Route path="tenders/:sourceId/:tenderId" element={<div>Tender Detail</div>} />
        <Route path="runs" element={<div>Runs</div>} />
        <Route path="runs/:sourceId/:runDate" element={<div>Run Detail</div>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** Defined route patterns that should NOT show the 404 page */
const DEFINED_ROUTE_PATTERNS = [
  /^\/$/,
  /^\/tenders$/,
  /^\/tenders\/[^/]+\/[^/]+$/,
  /^\/runs$/,
  /^\/runs\/[^/]+\/[^/]+$/,
]

function matchesDefinedRoute(path: string): boolean {
  return DEFINED_ROUTE_PATTERNS.some((pattern) => pattern.test(path))
}

/** Generator for URL path segments (lowercase alphanumeric with hyphens) */
const pathSegment = fc
  .stringMatching(/^[a-z0-9][a-z0-9-]*$/)
  .filter((s) => s.length >= 1 && s.length <= 20)

/** Generator for random paths that should not match defined routes */
const undefinedPathArb = fc
  .oneof(
    // Single segment paths like /settings, /about, /foo
    pathSegment.map((seg) => `/${seg}`),
    // Three-segment paths like /foo/bar/baz
    fc.tuple(pathSegment, pathSegment, pathSegment).map(([a, b, c]) => `/${a}/${b}/${c}`),
    // Four-segment paths like /a/b/c/d
    fc.tuple(pathSegment, pathSegment, pathSegment, pathSegment).map(([a, b, c, d]) => `/${a}/${b}/${c}/${d}`),
    // Two-segment paths that aren't /tenders or /runs based
    pathSegment.map((seg) => `/other/${seg}`),
  )
  .filter((path) => !matchesDefinedRoute(path))

describe('NotFoundPage property tests', () => {
  // Feature: rfp-web-v1, Property 4: Undefined routes show 404 page
  // **Validates: Requirements 3.4**
  it('Property 4: undefined routes render "Page not found"', () => {
    fc.assert(
      fc.property(undefinedPathArb, (path) => {
        const { unmount } = renderAtPath(path)
        expect(screen.getByText('Page not found')).toBeInTheDocument()
        unmount()
      }),
      { numRuns: 100 },
    )
  })
})
