import { useInfiniteQuery } from '@tanstack/react-query'
import { getTenders } from '@/api/endpoints'
import type { TenderListParams } from '@/api/types'

export function useTenders(params?: Omit<TenderListParams, 'cursor'>) {
  return useInfiniteQuery({
    queryKey: ['tenders', params],
    queryFn: ({ pageParam }) =>
      getTenders({ ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  })
}
