import { useTenderDocuments } from '@/hooks/useTenderDocuments'
import { getErrorMessage } from '@/utils/errors'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorAlert } from '@/components/ErrorAlert'

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface DocumentsSectionProps {
  sourceId: string
  tenderId: string
}

export function DocumentsSection({ sourceId, tenderId }: DocumentsSectionProps) {
  const docs = useTenderDocuments(sourceId, tenderId)
  const documents = docs.data?.items ?? []

  async function handleDownload(url: string) {
    await docs.refreshIfExpired()
    window.open(url, '_blank')
  }

  return (
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
  )
}
