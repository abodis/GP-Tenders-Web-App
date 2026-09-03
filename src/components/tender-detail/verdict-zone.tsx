import type { TenderDetailResponse } from '@/api/types'
import { FactorBar } from './factor-bar'

interface VerdictZoneProps {
  tender: TenderDetailResponse
}

export function VerdictZone({ tender }: VerdictZoneProps) {
  const showTeam = tender.team_match_result != null
  const showReferences = tender.reference_match_result != null
  const showExclusion = tender.exclusion_result != null

  return (
    <section className="border-b pb-6">
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8">
        {/* Left column: Factor Bars */}
        <div className="flex flex-col gap-4">
          {showTeam && (
            <FactorBar
              label="Team"
              score={tender.team_match_result!.team_match_score}
            />
          )}
          {showReferences && (
            <FactorBar
              label="References"
              score={tender.reference_match_result!.reference_match_score}
            />
          )}
          {showExclusion && (
            <FactorBar
              label="Exclusion"
              binary={{ excluded: tender.exclusion_result!.excluded }}
            />
          )}
        </div>

        {/* Right column: AI Summary Cascade */}
        <div className="flex flex-col gap-3">
          {tender.analysis_context != null ? (
            <>
              <p className="text-sm leading-relaxed text-gray-800">
                {tender.analysis_context}
              </p>
              {tender.analysis_summary != null && (
                <p className="text-sm leading-relaxed text-gray-600">
                  {tender.analysis_summary}
                </p>
              )}
            </>
          ) : tender.analysis_summary != null ? (
            <p className="text-sm leading-relaxed text-gray-800">
              {tender.analysis_summary}
            </p>
          ) : tender.interestingness_reasoning != null ? (
            <p className="text-sm leading-relaxed text-gray-800">
              {tender.interestingness_reasoning}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">
              No AI analysis available for this tender
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
