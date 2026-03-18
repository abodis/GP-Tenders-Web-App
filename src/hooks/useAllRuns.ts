import { useQuery } from '@tanstack/react-query'
import { getSources, getSourceRuns } from '@/api/endpoints'
import { sortRunsByDate } from '@/utils/sorting'
import type { RunItem, SourceListItem } from '@/api/types'

export function useAllRuns() {
  return useQuery({
    queryKey: ['allRuns'],
    queryFn: async (): Promise<RunItem[]> => {
      const raw = await getSources()
      const sources: SourceListItem[] = Array.isArray(raw)
        ? raw
        : (raw as unknown as { items: SourceListItem[] }).items ?? []
      const runsPerSource = await Promise.all(
        sources.map((s) => getSourceRuns(s.source_id)),
      )
      const merged = runsPerSource.flatMap((r) => r.items)
      return sortRunsByDate(merged)
    },
  })
}
