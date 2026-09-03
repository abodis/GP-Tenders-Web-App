import type { TenderDetailResponse } from '@/api/types'
import { RelevanceScoreVisual } from '@/components/RelevanceScoreVisual'
import { StatusBadge } from '@/components/StatusBadge'
import { VisibilityBadge } from '@/components/VisibilityBadge'

interface HeaderSectionProps {
  tender: TenderDetailResponse
}

export function HeaderSection({ tender }: HeaderSectionProps) {
  return (
    <section className="flex items-start gap-6">
      <RelevanceScoreVisual score={tender.relevance_score} />
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold">{tender.title}</h1>
        {tender.organization && (
          <p className="mt-1 text-base text-muted-foreground">{tender.organization}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {tender.status_name && <StatusBadge status={tender.status_name} />}
          <VisibilityBadge fullyVisible={tender.fully_visible} />
          {tender.source_id === 'developmentaid-org' && (
            <a
              href={`https://www.developmentaid.org/tenders/view/${tender.tender_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View on developmentaid.org
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3" aria-hidden="true">
                <path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69L6.22 8.72Z" />
                <path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25H7A.75.75 0 0 0 7 4H4.75A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25V9a.75.75 0 0 0-1.5 0v2.25c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25v-4.5Z" />
              </svg>
            </a>
          )}
          <span className="text-xs text-muted-foreground">{tender.source_id} · {tender.tender_id}</span>
        </div>
      </div>
    </section>
  )
}
