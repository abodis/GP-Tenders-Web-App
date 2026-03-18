import { useQuery } from '@tanstack/react-query'
import { getRunDetail } from '@/api/endpoints'

export function useRunDetail(sourceId: string, runDate: string) {
  return useQuery({
    queryKey: ['runDetail', sourceId, runDate],
    queryFn: () => getRunDetail(sourceId, runDate),
  })
}
