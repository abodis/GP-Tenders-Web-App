import { useQuery } from '@tanstack/react-query'
import { getTenders } from '@/api/endpoints'
import type { TenderListParams } from '@/api/types'

export function useTenders(params?: TenderListParams) {
  return useQuery({
    queryKey: ['tenders', params],
    queryFn: () => getTenders(params),
  })
}
