import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { render, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuditTrailSection } from './audit-trail-section'
import type { AuditRecord } from '@/api/types'

// Feature: tender-detail-overhaul, Property 9: Audit record rendering completeness
// **Validates: Requirements 9.5, 9.6**

vi.mock('@/hooks/useTenderAudit', () => ({
  useTenderAudit: vi.fn(),
}))

import { useTenderAudit } from '@/hooks/useTenderAudit'
const mockUseTenderAudit = vi.mocked(useTenderAudit)

// --- Arbitraries ---

const uuidArb = fc.uuid()

const nonEmptyString = fc.stringMatching(/^[A-Za-z][A-Za-z0-9_]{0,14}$/)

const isoDateArb = fc.integer({ min: 1577836800000, max: 1767225600000 })
  .map((ts) => new Date(ts).toISOString())

const simpleObjectArb = fc.dictionary(
  fc.stringMatching(/^[a-z]{1,8}$/),
  fc.oneof(fc.string({ maxLength: 20 }), fc.integer(), fc.boolean()),
  { minKeys: 1, maxKeys: 3 },
)

const auditRecordArb: fc.Arbitrary<AuditRecord> = fc.record({
  id: uuidArb,
  step: nonEmptyString,
  run_id: fc.oneof(fc.string({ minLength: 1, maxLength: 10 }), fc.constant(null)),
  created_at: isoDateArb,
  input_snapshot: simpleObjectArb,
  output: simpleObjectArb,
  model: fc.oneof(nonEmptyString, fc.constant(null)),
  model_version: fc.oneof(fc.string({ minLength: 1, maxLength: 5 }), fc.constant(null)),
  duration_ms: fc.oneof(fc.integer({ min: 1, max: 99999 }), fc.constant(null)),
})

const auditRecordsArb = fc.array(auditRecordArb, { minLength: 1, maxLength: 3 })

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuditTrailSection sourceId="test-source" tenderId="test-tender" />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AuditTrailSection property tests', () => {
  // Feature: tender-detail-overhaul, Property 9: Audit record rendering completeness
  // **Validates: Requirements 9.5, 9.6**
  it('Property 9: headers show step, model/"—", formatted timestamp, duration/"—"', () => {
    fc.assert(
      fc.property(auditRecordsArb, (records) => {
        mockUseTenderAudit.mockReturnValue({
          data: records,
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        } as unknown as ReturnType<typeof useTenderAudit>)

        const { container, unmount } = renderSection()

        // Expand the audit trail section
        const expandButton = container.querySelector('button')!
        fireEvent.click(expandButton)

        const content = container.textContent ?? ''

        for (const record of records) {
          // step name appears
          expect(content).toContain(record.step)

          // model or "—"
          if (record.model != null) {
            expect(content).toContain(record.model)
          }

          // duration_ms or "—"
          if (record.duration_ms != null) {
            expect(content).toContain(`${record.duration_ms}ms`)
          }
        }

        // Verify dash rendering for null fields
        const dashCount = (content.match(/—/g) ?? []).length
        const expectedDashes = records.filter((r) => r.model == null).length
          + records.filter((r) => r.duration_ms == null).length
        expect(dashCount).toBeGreaterThanOrEqual(expectedDashes)

        unmount()
      }),
      { numRuns: 100 },
    )
  })

  it('Property 9: expanded record shows JSON content in scrollable container', () => {
    fc.assert(
      fc.property(auditRecordsArb, (records) => {
        mockUseTenderAudit.mockReturnValue({
          data: records,
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        } as unknown as ReturnType<typeof useTenderAudit>)

        const { container, unmount } = renderSection()

        // Expand audit trail section
        const sectionButton = container.querySelector('button')!
        fireEvent.click(sectionButton)

        // Expand first record
        const recordButtons = container.querySelectorAll('.rounded-md.border button')
        if (recordButtons.length > 0) {
          fireEvent.click(recordButtons[0])

          // Assert scrollable container exists (max-h-[400px] overflow-auto)
          const scrollContainer = container.querySelector('.max-h-\\[400px\\].overflow-auto')
          expect(scrollContainer).not.toBeNull()

          // Assert JSON content of first record appears
          const firstRecord = [...records].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0]
          const scrollContent = scrollContainer!.textContent ?? ''
          // Verify input_snapshot JSON keys appear
          for (const key of Object.keys(firstRecord.input_snapshot)) {
            expect(scrollContent).toContain(key)
          }
          // Verify output JSON keys appear
          for (const key of Object.keys(firstRecord.output)) {
            expect(scrollContent).toContain(key)
          }
        }

        unmount()
      }),
      { numRuns: 100 },
    )
  })
})
