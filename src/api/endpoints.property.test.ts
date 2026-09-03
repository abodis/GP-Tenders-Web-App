import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'

vi.mock('@/api/client', () => ({
  apiPost: vi.fn().mockResolvedValue({}),
  apiDelete: vi.fn().mockResolvedValue(undefined),
  apiFetch: vi.fn().mockResolvedValue([]),
}))

import { apiPost, apiDelete, apiFetch } from '@/api/client'
import {
  extractTeamRequirements,
  runTeamMatch,
  extractReferenceRequirements,
  runReferenceMatch,
  checkExclusion,
  submitFeedback,
  deleteFeedback,
  getTenderAudit,
} from './endpoints'

/**
 * Feature: tender-detail-overhaul
 * Property 10: Endpoint URL construction correctness
 * Validates: Requirements 11.3
 */
describe('Endpoint URL construction property tests', () => {
  const safeString = fc.string({ minLength: 1, maxLength: 50 })
    .filter(s => !s.includes('/') && !s.includes('\\') && s.trim().length > 0)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Property 10: all endpoint functions construct correct URL paths', () => {
    fc.assert(
      fc.property(safeString, safeString, (sourceId, tenderId) => {
        vi.clearAllMocks()

        extractTeamRequirements(sourceId, tenderId)
        expect(apiPost).toHaveBeenCalledWith(`/tenders/${sourceId}/${tenderId}/extract-team`, {})

        runTeamMatch(sourceId, tenderId)
        expect(apiPost).toHaveBeenCalledWith(`/tenders/${sourceId}/${tenderId}/team-match`, {})

        extractReferenceRequirements(sourceId, tenderId)
        expect(apiPost).toHaveBeenCalledWith(`/tenders/${sourceId}/${tenderId}/extract-references`, {})

        runReferenceMatch(sourceId, tenderId)
        expect(apiPost).toHaveBeenCalledWith(`/tenders/${sourceId}/${tenderId}/reference-match`, {})

        checkExclusion(sourceId, tenderId)
        expect(apiPost).toHaveBeenCalledWith(`/tenders/${sourceId}/${tenderId}/check-exclusion`, {})

        submitFeedback(sourceId, tenderId, { feedback_type: 'interesting' })
        expect(apiPost).toHaveBeenCalledWith(`/tenders/${sourceId}/${tenderId}/feedback`, { feedback_type: 'interesting' })

        deleteFeedback(sourceId, tenderId)
        expect(apiDelete).toHaveBeenCalledWith(`/tenders/${sourceId}/${tenderId}/feedback`)

        getTenderAudit(sourceId, tenderId)
        expect(apiFetch).toHaveBeenCalledWith(`/tenders/${sourceId}/${tenderId}/audit`, undefined)
      }),
      { numRuns: 100 }
    )
  })
})
