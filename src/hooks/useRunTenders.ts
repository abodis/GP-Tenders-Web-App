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
        page: String(pageParam),
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.total_pages !== null && lastPage.page < lastPage.total_pages
        ? lastPage.page + 1
        : undefined,
  })
}
