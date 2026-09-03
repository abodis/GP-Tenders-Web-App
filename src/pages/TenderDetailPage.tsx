import { useParams, Link, Navigate } from 'react-router-dom'
import { useTenderDetail } from '@/hooks/useTenderDetail'
import { ApiError } from '@/api/client'
import { getErrorMessage } from '@/utils/errors'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorAlert } from '@/components/ErrorAlert'
import { classifyTenderState } from '@/utils/tender-state'
import { HeaderZone } from '@/components/tender-detail/header-zone'
import { VerdictZone } from '@/components/tender-detail/verdict-zone'
import { MatchFitnessTabs } from '@/components/tender-detail/match-fitness-tabs'
import { DetailsSection } from '@/components/tender-detail/details-section'
import { DeveloperSection } from '@/components/tender-detail/developer-section'

export default function TenderDetailPage() {
  const { sourceId, tenderId } = useParams<{ sourceId: string; tenderId: string }>()

  const {
    data: tender,
    isLoading,
    isError,
    error,
    refetch,
  } = useTenderDetail(sourceId!, tenderId!)

  if (isLoading) return <LoadingSpinner />

  if (isError) {
    if (error instanceof ApiError && error.statusCode === 404) {
      return (
        <div className="py-12 text-center">
          <h1 className="text-2xl font-bold">Tender not found</h1>
          <p className="mt-2 text-muted-foreground">
            The tender you're looking for doesn't exist.
          </p>
          <Link to="/tenders" className="mt-4 inline-block text-primary underline">
            Back to tenders
          </Link>
        </div>
      )
    }
    return (
      <ErrorAlert
        message={getErrorMessage(error)}
        onRetry={() => { refetch() }}
      />
    )
  }

  if (!tender) return null

  const state = classifyTenderState(tender)

  // Redirect skipped tenders before rendering any content
  if (state === 'skipped') {
    return <Navigate to="/tenders" replace />
  }

  // Determine section visibility based on state and data prerequisites
  const isAnalyzed = state === 'legacy_analyzed' || state === 'fully_analyzed'

  const showVerdict = isAnalyzed && (
    tender.unified_score != null ||
    tender.analysis_context != null ||
    tender.analysis_summary != null ||
    tender.interestingness_reasoning != null
  )

  const showMatchTabs = isAnalyzed && (
    tender.team_requirements != null ||
    tender.reference_requirements != null ||
    tender.exclusion_result != null ||
    tender.experts_required != null ||
    tender.references_required != null ||
    tender.turnover_required != null
  )

  const showDeveloper = isAnalyzed

  return (
    <div className="space-y-8">
      {/* Warnings banner above header */}
      {tender.warnings.length > 0 && (
        <div className="rounded-lg border border-yellow-400/50 bg-yellow-50 p-4">
          <h3 className="mb-1 text-sm font-semibold text-yellow-800">Warnings</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-yellow-700">
            {tender.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <HeaderZone tender={tender} sourceId={sourceId!} tenderId={tenderId!} />

      {showVerdict && <VerdictZone tender={tender} />}

      {showMatchTabs && (
        <MatchFitnessTabs
          tender={tender}
          state={state as 'legacy_analyzed' | 'fully_analyzed'}
          sourceId={sourceId!}
          tenderId={tenderId!}
        />
      )}

      <DetailsSection tender={tender} state={state} sourceId={sourceId!} tenderId={tenderId!} />

      {showDeveloper && (
        <DeveloperSection tender={tender} sourceId={sourceId!} tenderId={tenderId!} />
      )}
    </div>
  )
}
