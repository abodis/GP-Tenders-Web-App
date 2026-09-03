import type { TenderDetailResponse } from '@/api/types'
import { formatModelName, formatDateTime } from '@/utils/formatting'
import { Tooltip } from '@base-ui/react/tooltip'

interface AiAssessmentSectionProps {
  tender: TenderDetailResponse
}

export function AiAssessmentSection({ tender }: AiAssessmentSectionProps) {
  if (!tender.analysis_context && !tender.analysis_summary) return null

  return (
    <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {tender.analysis_summary && (
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">Summary</h3>
            {(tender.analysis_model || tender.analyzed_at) && (
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-none text-muted-foreground hover:text-foreground">
                    AI
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Positioner sideOffset={4}>
                      <Tooltip.Popup className="z-50 max-w-xs rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
                        <div className="space-y-1">
                          {tender.analysis_model && <p>Model: {formatModelName(tender.analysis_model)}</p>}
                          {tender.analyzed_at && <p>Analyzed: {formatDateTime(tender.analyzed_at)}</p>}
                        </div>
                      </Tooltip.Popup>
                    </Tooltip.Positioner>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            )}
          </div>
          <p className="text-sm whitespace-pre-wrap">{tender.analysis_summary}</p>
        </div>
      )}
      {tender.analysis_context && (
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">Fit Analysis</h3>
            {(tender.analysis_model || tender.analyzed_at) && (
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-none text-muted-foreground hover:text-foreground">
                    AI
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Positioner sideOffset={4}>
                      <Tooltip.Popup className="z-50 max-w-xs rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
                        <div className="space-y-1">
                          {tender.analysis_model && <p>Model: {formatModelName(tender.analysis_model)}</p>}
                          {tender.analyzed_at && <p>Analyzed: {formatDateTime(tender.analyzed_at)}</p>}
                        </div>
                      </Tooltip.Popup>
                    </Tooltip.Positioner>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            )}
          </div>
          <p className="text-sm whitespace-pre-wrap">{tender.analysis_context}</p>
        </div>
      )}
    </section>
  )
}
