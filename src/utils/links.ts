/**
 * Parses a run ID in the format `{source_id}#{run_date}` into a URL path
 * `/runs/{source_id}/{run_date}`.
 *
 * Returns null for null or undefined input.
 */
export function runIdToUrl(runId: string | null | undefined): string | null {
  if (runId == null) {
    return null
  }

  const [sourceId, runDate] = runId.split('#')
  return `/runs/${sourceId}/${runDate}`
}
