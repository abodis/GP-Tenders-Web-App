import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { classifyTenderState, getScoreBadgeColor, getFactorBarColor, type TenderState } from './tender-state'
import type { TenderDetailResponse, TeamRequirement, ReferenceRequirement, ExclusionCriterion } from '@/api/types'

/**
 * Feature: tender-detail-reflow
 * Property tests for classifyTenderState
 */

const VALID_STATES: TenderState[] = ['skipped', 'unanalyzed', 'legacy_analyzed', 'fully_analyzed']

/** Generator for nullable string (either a non-empty string or null) */
const nullableString = fc.option(fc.string({ minLength: 1 }), { nil: null })

/** Generator for nullable ExpertsRequired */
const nullableExpertsRequired = fc.option(
  fc.record({
    international: fc.nat(),
    local: fc.nat(),
    key_experts: fc.nat(),
    total: fc.nat(),
    notes: nullableString,
  }),
  { nil: null },
)

/** Generator for nullable ReferencesRequired */
const nullableReferencesRequired = fc.option(
  fc.record({
    count: fc.nat(),
    type: fc.string(),
    value_eur: fc.nat(),
    timeline_years: fc.nat(),
    notes: nullableString,
  }),
  { nil: null },
)

/** Generator for nullable TurnoverRequired */
const nullableTurnoverRequired = fc.option(
  fc.record({
    annual_eur: fc.nat(),
    years: fc.nat(),
    notes: nullableString,
  }),
  { nil: null },
)

/** Generator for nullable TeamRequirementsData */
const nullableTeamRequirements = fc.option(
  fc.record({
    team_requirements: fc.constant([] as TeamRequirement[]),
    total_experts_required: fc.option(fc.nat(), { nil: null }),
    extraction_confidence: fc.constantFrom('high' as const, 'medium' as const, 'low' as const),
  }),
  { nil: null },
)

/** Generator for nullable ReferenceRequirementsData */
const nullableReferenceRequirements = fc.option(
  fc.record({
    reference_requirements: fc.constant([] as ReferenceRequirement[]),
    total_references_required: fc.option(fc.nat(), { nil: null }),
    extraction_confidence: fc.constantFrom('high' as const, 'medium' as const, 'low' as const),
  }),
  { nil: null },
)

/** Generator for nullable ExclusionResult */
const nullableExclusionResult = fc.option(
  fc.record({
    criteria: fc.constant([] as ExclusionCriterion[]),
    excluded: fc.boolean(),
    exclusion_reasons: fc.constant([] as string[]),
    uncertain_flags: fc.constant([] as string[]),
    extraction_confidence: fc.constantFrom('high' as const, 'medium' as const, 'low' as const),
  }),
  { nil: null },
)

/** Build a minimal TenderDetailResponse with only classification-relevant fields varying */
function buildTender(fields: {
  skip_reason: string | null
  team_requirements: TenderDetailResponse['team_requirements']
  reference_requirements: TenderDetailResponse['reference_requirements']
  exclusion_result: TenderDetailResponse['exclusion_result']
  experts_required: TenderDetailResponse['experts_required']
  references_required: TenderDetailResponse['references_required']
  turnover_required: TenderDetailResponse['turnover_required']
}): TenderDetailResponse {
  return {
    source_id: 'src-1',
    tender_id: 'tender-1',
    title: 'Test Tender',
    posted_date: '2024-01-01',
    deadline: null,
    discovered_at: '2024-01-01T00:00:00Z',
    status: 'completed',
    fully_visible: true,
    budget: 0,
    currency: null,
    status_name: null,
    location_names: null,
    sectors: null,
    types: null,
    documents_total: 0,
    relevance_score: null,
    analysis_summary: null,
    analysis_tags: [],
    tender_type: null,
    analyzed_at: null,
    organization: null,
    interestingness_score: null,
    unified_score: null,
    skip_reason: fields.skip_reason,
    pk: 'pk-1',
    retry_count: 0,
    last_attempt: null,
    last_error: null,
    s3_prefix: null,
    documents_downloaded: 0,
    documents_failed: 0,
    discovered_run_id: null,
    processed_run_id: null,
    detail: null,
    description_text: null,
    warnings: [],
    analysis_context: null,
    analysis_model: null,
    emailed_at: null,
    experts_required: fields.experts_required,
    references_required: fields.references_required,
    turnover_required: fields.turnover_required,
    team_requirements: fields.team_requirements,
    team_match_result: null,
    reference_requirements: fields.reference_requirements,
    reference_match_result: null,
    exclusion_result: fields.exclusion_result,
    feedback_type: null,
    interestingness_reasoning: null,
  } as TenderDetailResponse
}

/** Arbitrary for the classification-relevant fields */
const arbClassificationFields = fc.record({
  skip_reason: nullableString,
  team_requirements: nullableTeamRequirements,
  reference_requirements: nullableReferenceRequirements,
  exclusion_result: nullableExclusionResult,
  experts_required: nullableExpertsRequired,
  references_required: nullableReferencesRequired,
  turnover_required: nullableTurnoverRequired,
})

describe('classifyTenderState — Property Tests', () => {
  /**
   * **Validates: Requirements 1.1, 1.6**
   *
   * Property 1: State classification is total and deterministic
   * For any combination of nullable fields, function returns exactly one value
   * from the TenderState set.
   */
  it('Property 1: returns exactly one valid TenderState for any input', () => {
    fc.assert(
      fc.property(arbClassificationFields, (fields) => {
        const tender = buildTender(fields)
        const result = classifyTenderState(tender)

        // Result is one of the valid states
        expect(VALID_STATES).toContain(result)

        // Deterministic: calling again yields the same result
        expect(classifyTenderState(tender)).toBe(result)
      }),
      { numRuns: 200 },
    )
  })

  /**
   * **Validates: Requirements 1.2**
   *
   * Property 2: skip_reason dominates all other classification fields
   * When skip_reason is non-null, result is always 'skipped' regardless of
   * other field values.
   */
  it('Property 2: skip_reason non-null always yields skipped', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        nullableTeamRequirements,
        nullableReferenceRequirements,
        nullableExclusionResult,
        nullableExpertsRequired,
        nullableReferencesRequired,
        nullableTurnoverRequired,
        (skipReason, teamReq, refReq, exclResult, expertsReq, refsReq, turnoverReq) => {
          const tender = buildTender({
            skip_reason: skipReason,
            team_requirements: teamReq,
            reference_requirements: refReq,
            exclusion_result: exclResult,
            experts_required: expertsReq,
            references_required: refsReq,
            turnover_required: turnoverReq,
          })

          expect(classifyTenderState(tender)).toBe('skipped')
        },
      ),
      { numRuns: 200 },
    )
  })
})

// Feature: tender-detail-reflow, Property 3: Score badge color mapping respects range boundaries
describe('getScoreBadgeColor — Property Tests', () => {
  /**
   * **Validates: Requirements 3.3, 4.2, 4.4**
   *
   * Property 3: Score badge color mapping respects range boundaries
   * green ≥ 7.0, yellow ≥ 4.0, red > 0, gray for null/0
   */
  it('Property 3: score badge color mapping respects range boundaries', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.double({ min: 0, max: 10, noNaN: true, noDefaultInfinity: true }),
        ),
        (score) => {
          const color = getScoreBadgeColor(score)

          if (score === null || score === 0) {
            expect(color).toBe('gray')
          } else if (score >= 7.0) {
            expect(color).toBe('green')
          } else if (score >= 4.0) {
            expect(color).toBe('yellow')
          } else {
            expect(color).toBe('red')
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})

// Feature: tender-detail-reflow, Property 4: Factor bar color mapping respects range boundaries
describe('getFactorBarColor — Property Tests', () => {
  /**
   * **Validates: Requirements 3.3, 4.2, 4.4**
   *
   * Property 4: Factor bar color mapping respects range boundaries
   * green ≥ 0.7, yellow ≥ 0.4, red < 0.4
   */
  it('Property 4: factor bar color mapping respects range boundaries', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        (score) => {
          const color = getFactorBarColor(score)

          if (score >= 0.7) {
            expect(color).toBe('green')
          } else if (score >= 0.4) {
            expect(color).toBe('yellow')
          } else {
            expect(color).toBe('red')
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
