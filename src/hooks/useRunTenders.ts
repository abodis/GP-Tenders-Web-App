import { useInfiniteQuery } from '@tanstack/react-query'
import { getRunTenders } from '@/api/endpoints'

export function useRunTenders(
  sourceId: string,
  runDate: string,
  phase: 'discovered' | 'processed',
) {
  return useInfiniteQuery({
    queryKey: ['runTenders', sourceId, runDate, phase],
    queryFn: ({ pageParam }) =>
      getRunTenders(sourceId, runDate, phase, {
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  })
}
