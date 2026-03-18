import type { RunItem } from '@/api/types'

export function filterRunsBySource(
  runs: RunItem[],
  sourceId: string | null
): RunItem[] {
  if (sourceId === null) {
    return runs
  }
  return runs.filter((run) => run.source_id === sourceId)
}
