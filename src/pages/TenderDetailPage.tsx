import { useParams, Link } from 'react-router-dom'
import { useTenderDetail } from '@/hooks/useTenderDetail'
import { ApiError } from '@/api/client'
import { getErrorMessage } from '@/utils/errors'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorAlert } from '@/components/ErrorAlert'
import { HeaderSection } from '@/components/tender-detail/header-section'
import { AiAssessmentSection } from '@/components/tender-detail/ai-assessment-section'
import { KeyFactsSection } from '@/components/tender-detail/key-facts-section'
import { EligibilitySection } from '@/components/tender-detail/eligibility-section'
import { DescriptionSection } from '@/components/tender-detail/description-section'
import { DocumentsSection } from '@/components/tender-detail/documents-section'
import { SystemInfoSection } from '@/components/tender-detail/system-info-section'
import { ExclusionBanner } from '@/components/tender-detail/exclusion-banner'
import { FeedbackButtons } from '@/components/tender-detail/feedback-buttons'
import { ScoreBreakdownSection } from '@/components/tender-detail/score-breakdown-section'
import { TeamRequirementsSection } from '@/components/tender-detail/team-requirements-section'
import { TeamMatchSection } from '@/components/tender-detail/team-match-section'
import { ReferenceRequirementsSection } from '@/components/tender-detail/reference-requirements-section'
import { ReferenceMatchSection } from '@/components/tender-detail/reference-match-section'
import { ExclusionCriteriaSection } from '@/components/tender-detail/exclusion-criteria-section'
import { AuditTrailSection } from '@/components/tender-detail/audit-trail-section'

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

  return (
    <div className="space-y-8">
      {/* Warnings */}
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

      <ExclusionBanner exclusionResult={tender.exclusion_result} />

      <HeaderSection tender={tender} />
      <AiAssessmentSection tender={tender} />
      <FeedbackButtons sourceId={sourceId!} tenderId={tenderId!} feedbackType={tender.feedback_type} />
      <KeyFactsSection tender={tender} />
      <ScoreBreakdownSection tender={tender} />
      <TeamRequirementsSection tender={tender} sourceId={sourceId!} tenderId={tenderId!} />
      <TeamMatchSection tender={tender} sourceId={sourceId!} tenderId={tenderId!} />
      <ReferenceRequirementsSection tender={tender} sourceId={sourceId!} tenderId={tenderId!} />
      <ReferenceMatchSection tender={tender} sourceId={sourceId!} tenderId={tenderId!} />
      <ExclusionCriteriaSection tender={tender} sourceId={sourceId!} tenderId={tenderId!} />
      <EligibilitySection tender={tender} />
      <DescriptionSection descriptionText={tender.description_text} />
      <DocumentsSection sourceId={sourceId!} tenderId={tenderId!} />
      <AuditTrailSection sourceId={sourceId!} tenderId={tenderId!} />
      <SystemInfoSection tender={tender} />
    </div>
  )
}
