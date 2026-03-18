import { useQuery } from '@tanstack/react-query'
import { getTenderDetail } from '@/api/endpoints'

export function useTenderDetail(sourceId: string, tenderId: string) {
  return useQuery({
    queryKey: ['tenderDetail', sourceId, tenderId],
    queryFn: () => getTenderDetail(sourceId, tenderId),
  })
}
