import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { runIdToUrl } from '@/utils/links'

// Feature: rfp-web-v1, Property 13: Run ID to URL link generation

const alphanumWithHyphens = fc.stringMatching(/^[a-zA-Z0-9-]{1,30}$/)

describe('links property tests', () => {
  // Feature: rfp-web-v1, Property 13: Run ID to URL link generation
  // **Validates: Requirements 7.16**
  it('Property 13: produces /runs/{source_id}/{run_date} for any valid run ID', () => {
    fc.assert(
      fc.property(alphanumWithHyphens, alphanumWithHyphens, (sourceId, runDate) => {
        const runId = `${sourceId}#${runDate}`
        const result = runIdToUrl(runId)
        expect(result).toBe(`/runs/${sourceId}/${runDate}`)
      }),
      { numRuns: 100 },
    )
  })

  it('Property 13: returns null for null input', () => {
    expect(runIdToUrl(null)).toBe(null)
  })

  it('Property 13: returns null for undefined input', () => {
    expect(runIdToUrl(undefined)).toBe(null)
  })
})
