import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTenderDetail } from '@/hooks/useTenderDetail'
import { useTenderDocuments } from '@/hooks/useTenderDocuments'
import { ApiError } from '@/api/client'
import { getErrorMessage } from '@/utils/errors'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorAlert } from '@/components/ErrorAlert'
import { RelevanceScoreVisual } from '@/components/RelevanceScoreVisual'
import { StatusBadge } from '@/components/StatusBadge'
import { VisibilityBadge } from '@/components/VisibilityBadge'
import { formatBudget, formatEur } from '@/utils/formatting'
import { InfoTooltip } from '@/components/InfoTooltip'
import { runIdToUrl } from '@/utils/links'
import { cn } from '@/lib/utils'

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children ?? '—'}</dd>
    </div>
  )
}

function EligibilitySubGroup({ title, notes, numericContent }: {
  title: string
  notes: string | null
  numericContent: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {notes && <InfoTooltip>{numericContent}</InfoTooltip>}
      </div>
      {notes ? (
        <p className="text-sm text-muted-foreground">{notes}</p>
      ) : (
        <div className="text-sm">{numericContent}</div>
      )}
    </div>
  )
}

export default function TenderDetailPage() {
  const { sourceId, tenderId } = useParams<{ sourceId: string; tenderId: string }>()

  const {
    data: tender,
    isLoading,
    isError,
    error,
    refetch,
  } = useTenderDetail(sourceId!, tenderId!)

  const docs = useTenderDocuments(sourceId!, tenderId!)
  const documents = docs.data?.items ?? []
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [systemInfoExpanded, setSystemInfoExpanded] = useState(false)

  async function handleDownload(url: string) {
    await docs.refreshIfExpired()
    window.open(url, '_blank')
  }

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

  const discoveredRunUrl = runIdToUrl(tender.discovered_run_id)
  const processedRunUrl = runIdToUrl(tender.processed_run_id)

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

      {/* Header */}
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

      {/* Key Facts Grid */}
      <section>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Budget">{formatBudget(tender.budget)}</Field>
          <Field label="Deadline">{tender.deadline ?? '—'}</Field>
          <Field label="Location">{tender.location_names ?? '—'}</Field>
          <Field label="Tender Type">{tender.tender_type ?? '—'}</Field>
          <Field label="Posted Date">{tender.posted_date}</Field>
          <Field label="Sectors">{tender.sectors ?? '—'}</Field>
          <Field label="Types">{tender.types ?? '—'}</Field>
          <Field label="Tags">
            {tender.analysis_tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {tender.analysis_tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            ) : '—'}
          </Field>
        </dl>
      </section>

      {/* AI Assessment */}
      {(tender.analysis_context || tender.analysis_summary) && (
        <section>
          <div className="flex items-baseline gap-3">
            <h2 className="text-lg font-semibold">AI Assessment</h2>
            {(tender.analysis_model || tender.analyzed_at) && (
              <span className="text-xs text-muted-foreground">
                {[tender.analysis_model, tender.analyzed_at].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
          {tender.analysis_context && (
            <div className="mt-3">
              <h3 className="mb-1 text-sm font-medium text-muted-foreground">Fit Analysis</h3>
              <p className="text-sm whitespace-pre-wrap">{tender.analysis_context}</p>
            </div>
          )}
          {tender.analysis_summary && (
            <div className="mt-3">
              <h3 className="mb-1 text-sm font-medium text-muted-foreground">Summary</h3>
              <p className="text-sm whitespace-pre-wrap">{tender.analysis_summary}</p>
            </div>
          )}
        </section>
      )}

      {/* Eligibility */}
      {(tender.experts_required || tender.references_required || tender.turnover_required) && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Eligibility Requirements</h2>
          <div className="space-y-4">
            {tender.experts_required && (
              <EligibilitySubGroup
                title="Experts Required"
                notes={tender.experts_required.notes}
                numericContent={
                  <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-sm">
                    <Field label="International">{tender.experts_required.international}</Field>
                    <Field label="Local">{tender.experts_required.local}</Field>
                    <Field label="Key Experts">{tender.experts_required.key_experts}</Field>
                    <Field label="Total">{tender.experts_required.total}</Field>
                  </dl>
                }
              />
            )}
            {tender.references_required && (
              <EligibilitySubGroup
                title="References Required"
                notes={tender.references_required.notes}
                numericContent={
                  <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-sm">
                    <Field label="Count">{tender.references_required.count}</Field>
                    <Field label="Type">{tender.references_required.type}</Field>
                    <Field label="Value">{formatEur(tender.references_required.value_eur)}</Field>
                    <Field label="Timeline">{tender.references_required.timeline_years} years</Field>
                  </dl>
                }
              />
            )}
            {tender.turnover_required && (
              <EligibilitySubGroup
                title="Turnover Required"
                notes={tender.turnover_required.notes}
                numericContent={
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <Field label="Annual">{formatEur(tender.turnover_required.annual_eur)}</Field>
                    <Field label="Years">{tender.turnover_required.years}</Field>
                  </dl>
                }
              />
            )}
          </div>
        </section>
      )}

      {/* Description */}
      {tender.description_text && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Description</h2>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className={cn("text-sm whitespace-pre-wrap", !descriptionExpanded && "line-clamp-6")}>
              {tender.description_text}
            </p>
            <button
              onClick={() => setDescriptionExpanded(!descriptionExpanded)}
              className="mt-2 text-sm text-primary underline"
            >
              {descriptionExpanded ? 'Show less' : 'Show full description'}
            </button>
          </div>
        </section>
      )}

      {/* Documents */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Documents</h2>
        {docs.isLoading ? (
          <LoadingSpinner />
        ) : docs.isError ? (
          <ErrorAlert
            message={getErrorMessage(docs.error)}
            onRetry={() => { docs.refetch() }}
          />
        ) : documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents available</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Filename</th>
                  <th className="px-4 py-3 text-left font-medium">Size</th>
                  <th className="px-4 py-3 text-left font-medium">Download</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.filename} className="border-b">
                    <td className="px-4 py-3">{doc.filename}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatBytes(doc.size_bytes)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDownload(doc.url)}
                        className="text-primary underline"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* System Info */}
      <section>
        <button
          onClick={() => setSystemInfoExpanded(!systemInfoExpanded)}
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <span className={cn("transition-transform", systemInfoExpanded && "rotate-90")}>▶</span>
          System Info
        </button>
        {systemInfoExpanded && (
          <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Field label="Scraper Status"><StatusBadge status={tender.status} /></Field>
            <Field label="Retry Count">{tender.retry_count}</Field>
            <Field label="Last Attempt">{tender.last_attempt ?? '—'}</Field>
            <Field label="Last Error">{tender.last_error ?? '—'}</Field>
            <Field label="Docs Downloaded">{tender.documents_downloaded}</Field>
            <Field label="Docs Failed">{tender.documents_failed}</Field>
            <Field label="Skip Reason">{tender.skip_reason ?? '—'}</Field>
            <Field label="Discovery Run">
              {discoveredRunUrl ? <Link to={discoveredRunUrl} className="text-primary underline">View</Link> : '—'}
            </Field>
            <Field label="Processing Run">
              {processedRunUrl ? <Link to={processedRunUrl} className="text-primary underline">View</Link> : '—'}
            </Field>
            <Field label="Analysis Model">{tender.analysis_model ?? '—'}</Field>
            <Field label="Analyzed At">{tender.analyzed_at ?? '—'}</Field>
            <Field label="Emailed At">{tender.emailed_at ?? '—'}</Field>
            <Field label="Source ID">{tender.source_id}</Field>
            <Field label="Tender ID">{tender.tender_id}</Field>
          </dl>
        )}
      </section>
    </div>
  )
}
