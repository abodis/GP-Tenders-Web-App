import { useParams, Link } from 'react-router-dom'
import { useTenderDetail } from '@/hooks/useTenderDetail'
import { useTenderDocuments } from '@/hooks/useTenderDocuments'
import { ApiError } from '@/api/client'
import { getErrorMessage } from '@/utils/errors'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorAlert } from '@/components/ErrorAlert'
import { ScoreBadge } from '@/components/ScoreBadge'
import { StatusBadge } from '@/components/StatusBadge'
import { formatBudget } from '@/utils/formatting'
import { runIdToUrl } from '@/utils/links'

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

      {/* Metadata */}
      <section>
        <h1 className="text-2xl font-bold">{tender.title}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{tender.source_id}</span>
          <span>·</span>
          <span>{tender.tender_id}</span>
          <span>·</span>
          <StatusBadge status={tender.status} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Organization">{tender.organization ?? '—'}</Field>
          <Field label="Budget">{formatBudget(tender.budget)}</Field>
          <Field label="Deadline">{tender.deadline ?? '—'}</Field>
          <Field label="Location">{tender.location_names ?? '—'}</Field>
          <Field label="Sectors">{tender.sectors ?? '—'}</Field>
          <Field label="Types">{tender.types ?? '—'}</Field>
          <Field label="Posted Date">{tender.posted_date}</Field>
          <Field label="Status Name">{tender.status_name ?? '—'}</Field>
        </dl>
      </section>

      {/* Run Links */}
      {(discoveredRunUrl || processedRunUrl) && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Run Links</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            {discoveredRunUrl && (
              <Link to={discoveredRunUrl} className="text-primary underline">
                Discovery Run
              </Link>
            )}
            {processedRunUrl && (
              <Link to={processedRunUrl} className="text-primary underline">
                Processing Run
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Scraper Status */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Scraper Status</h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Status"><StatusBadge status={tender.status} /></Field>
          <Field label="Retry Count">{tender.retry_count}</Field>
          <Field label="Last Attempt">{tender.last_attempt ?? '—'}</Field>
          <Field label="Last Error">{tender.last_error ?? '—'}</Field>
          <Field label="Docs Downloaded">{tender.documents_downloaded}</Field>
          <Field label="Docs Failed">{tender.documents_failed}</Field>
          {tender.skip_reason && (
            <Field label="Skip Reason">{tender.skip_reason}</Field>
          )}
        </dl>
      </section>

      {/* Analysis */}
      {tender.analyzed_at && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Analysis</h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Relevance Score"><ScoreBadge score={tender.relevance_score} /></Field>
            <Field label="Tender Type">{tender.tender_type ?? '—'}</Field>
            <Field label="Model">{tender.analysis_model ?? '—'}</Field>
            <Field label="Analyzed At">{tender.analyzed_at}</Field>
            {tender.analysis_tags.length > 0 && (
              <Field label="Tags">
                <div className="flex flex-wrap gap-1">
                  {tender.analysis_tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </Field>
            )}
          </dl>
          {tender.analysis_summary && (
            <div className="mt-4">
              <h3 className="mb-1 text-sm font-medium text-muted-foreground">Summary</h3>
              <p className="text-sm whitespace-pre-wrap">{tender.analysis_summary}</p>
            </div>
          )}
          {tender.analysis_context && (
            <div className="mt-4">
              <h3 className="mb-1 text-sm font-medium text-muted-foreground">Context</h3>
              <p className="text-sm whitespace-pre-wrap">{tender.analysis_context}</p>
            </div>
          )}
        </section>
      )}

      {/* Requirements: Experts */}
      {tender.experts_required && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Experts Required</h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <Field label="International">{tender.experts_required.international}</Field>
            <Field label="Local">{tender.experts_required.local}</Field>
            <Field label="Key Experts">{tender.experts_required.key_experts}</Field>
            <Field label="Total">{tender.experts_required.total}</Field>
            <Field label="Notes">{tender.experts_required.notes ?? '—'}</Field>
          </dl>
        </section>
      )}

      {/* Requirements: References */}
      {tender.references_required && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">References Required</h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <Field label="Count">{tender.references_required.count}</Field>
            <Field label="Type">{tender.references_required.type}</Field>
            <Field label="Value (EUR)">{new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(tender.references_required.value_eur)}</Field>
            <Field label="Timeline (Years)">{tender.references_required.timeline_years}</Field>
            <Field label="Notes">{tender.references_required.notes ?? '—'}</Field>
          </dl>
        </section>
      )}

      {/* Requirements: Turnover */}
      {tender.turnover_required && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Turnover Required</h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Annual (EUR)">{new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(tender.turnover_required.annual_eur)}</Field>
            <Field label="Years">{tender.turnover_required.years}</Field>
            <Field label="Notes">{tender.turnover_required.notes ?? '—'}</Field>
          </dl>
        </section>
      )}

      {/* Description */}
      {tender.description_text && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Description</h2>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm whitespace-pre-wrap">{tender.description_text}</p>
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
    </div>
  )
}
