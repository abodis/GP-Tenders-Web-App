import type { TenderDetailResponse } from '@/api/types'
import { ScoreBadge } from './score-badge'
import { ActionsDropdown } from './actions-dropdown'
import { FeedbackButtons } from './feedback-buttons'
import { humanizeTenderType } from '@/utils/format'

interface HeaderZoneProps {
  tender: TenderDetailResponse
  sourceId: string
  tenderId: string
}

function truncateTitle(title: string, max = 200): string {
  if (title.length <= max) return title
  return title.slice(0, max) + '\u2026'
}

function formatDeadline(deadline: string | null): string {
  if (deadline == null) return 'No deadline'
  return new Date(deadline).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function buildMetadataRow(tender: TenderDetailResponse): string {
  const tenderType = humanizeTenderType(tender.tender_type)
  const segments: string[] = [
    tender.organization ?? 'Unknown organization',
    ...(tenderType ? [tenderType] : []),
    formatDeadline(tender.deadline),
    ...(tender.location_names ? [tender.location_names] : []),
  ]
  return segments.join(' \u00b7 ')
}

export function HeaderZone({ tender, sourceId, tenderId }: HeaderZoneProps) {
  return (
    <section className="flex items-start gap-6">
      {/* Left column: score badge + feedback */}
      <div className="flex shrink-0 flex-col items-center gap-2 pt-1">
        <ScoreBadge score={tender.unified_score} />
        <FeedbackButtons
          sourceId={sourceId}
          tenderId={tenderId}
          feedbackType={tender.feedback_type}
        />
      </div>

      {/* Right column: title, metadata, actions */}
      <div className="min-w-0 flex-1 space-y-2">
        {/* Title */}
        <h1 className="text-2xl font-bold">{truncateTitle(tender.title)}</h1>

        {/* Metadata row + actions */}
        <div className="flex flex-wrap items-center gap-x-2 text-sm text-foreground">
          <span>{buildMetadataRow(tender)}</span>
          <ActionsDropdown sourceId={sourceId} tenderId={tenderId} />
        </div>
      </div>
    </section>
  )
}
