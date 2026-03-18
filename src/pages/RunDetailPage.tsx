import { useParams, useNavigate, Link } from 'react-router-dom'
import { useRunDetail } from '@/hooks/useRunDetail'
import { useRunTenders } from '@/hooks/useRunTenders'
import { ApiError } from '@/api/client'
import { getErrorMessage } from '@/utils/errors'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorAlert } from '@/components/ErrorAlert'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { LoadMoreButton } from '@/components/LoadMoreButton'

export default function RunDetailPage() {
  const { sourceId, runDate } = useParams<{ sourceId: string; runDate: string }>()
  const navigate = useNavigate()

  const {
    data: run,
    isLoading,
    isError,
    error,
    refetch,
  } = useRunDetail(sourceId!, runDate!)

  const discovered = useRunTenders(sourceId!, runDate!, 'discovered')
  const processed = useRunTenders(sourceId!, runDate!, 'processed')

  if (isLoading) return <LoadingSpinner />

  if (isError) {
    if (error instanceof ApiError && error.statusCode === 404) {
      return (
        <div className="py-12 text-center">
          <h1 className="text-2xl font-bold">Run not found</h1>
          <p className="mt-2 text-muted-foreground">
            The run you're looking for doesn't exist.
          </p>
          <Link to="/runs" className="mt-4 inline-block text-primary underline">
            Back to runs
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

  if (!run) return null

  const collector = run.collector_result
  const retriever = run.retriever_result
  const discoveredTenders = discovered.data?.pages.flatMap((p) => p.items) ?? []
  const processedTenders = processed.data?.pages.flatMap((p) => p.items) ?? []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Run Detail</h1>
        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
          <span>{sourceId}</span>
          <span>·</span>
          <span>{runDate}</span>
          <span>·</span>
          <StatusBadge status={run.status} />
        </div>
      </div>

      {/* Collector Stats */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Collector Results</h2>
        {collector ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Total Found" value={collector.total_found} />
            <StatCard label="New Tenders" value={collector.new_tenders} />
            <StatCard label="New Pending" value={collector.new_pending} />
            <StatCard label="New Skipped" value={collector.new_skipped} />
            <StatCard label="Duplicates" value={collector.duplicates} />
            <StatCard label="Errors" value={collector.errors} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No collector results available</p>
        )}
      </section>

      {/* Retriever Stats */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Retriever Results</h2>
        {retriever ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Processed" value={retriever.processed} />
            <StatCard label="Successful" value={retriever.successful} />
            <StatCard label="Failed" value={retriever.failed} />
            <StatCard label="Permanently Failed" value={retriever.permanently_failed} />
            <StatCard label="Docs Downloaded" value={retriever.documents_downloaded} />
            <StatCard label="Docs Failed" value={retriever.documents_failed} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No retriever results available</p>
        )}
      </section>

      {/* Discovered Tenders */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Discovered Tenders</h2>
        {discovered.isLoading ? (
          <LoadingSpinner />
        ) : discovered.isError ? (
          <ErrorAlert
            message={getErrorMessage(discovered.error)}
            onRetry={() => { discovered.refetch() }}
          />
        ) : discoveredTenders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No discovered tenders</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Title</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Tender ID</th>
                  </tr>
                </thead>
                <tbody>
                  {discoveredTenders.map((tender) => (
                    <tr
                      key={`${tender.source_id}-${tender.tender_id}`}
                      onClick={() => navigate(`/tenders/${tender.source_id}/${tender.tender_id}`)}
                      className="cursor-pointer border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3">{tender.title}</td>
                      <td className="px-4 py-3"><StatusBadge status={tender.status} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{tender.tender_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {discovered.hasNextPage && (
              <LoadMoreButton
                onClick={() => { discovered.fetchNextPage() }}
                isLoading={discovered.isFetchingNextPage}
              />
            )}
          </>
        )}
      </section>

      {/* Processed Tenders */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Processed Tenders</h2>
        {processed.isLoading ? (
          <LoadingSpinner />
        ) : processed.isError ? (
          <ErrorAlert
            message={getErrorMessage(processed.error)}
            onRetry={() => { processed.refetch() }}
          />
        ) : processedTenders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No processed tenders</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Title</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Tender ID</th>
                  </tr>
                </thead>
                <tbody>
                  {processedTenders.map((tender) => (
                    <tr
                      key={`${tender.source_id}-${tender.tender_id}`}
                      onClick={() => navigate(`/tenders/${tender.source_id}/${tender.tender_id}`)}
                      className="cursor-pointer border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3">{tender.title}</td>
                      <td className="px-4 py-3"><StatusBadge status={tender.status} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{tender.tender_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {processed.hasNextPage && (
              <LoadMoreButton
                onClick={() => { processed.fetchNextPage() }}
                isLoading={processed.isFetchingNextPage}
              />
            )}
          </>
        )}
      </section>
    </div>
  )
}
