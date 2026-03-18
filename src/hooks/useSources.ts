import { useQuery } from '@tanstack/react-query'
import { getSources } from '@/api/endpoints'
import type { SourceListItem } from '@/api/types'

export function useSources() {
  return useQuery({
    queryKey: ['sources'],
    queryFn: getSources,
    select: (data): SourceListItem[] => {
      if (Array.isArray(data)) return data
      // Handle paginated response shape from API
      if (data && typeof data === 'object' && 'items' in data) {
        return (data as { items: SourceListItem[] }).items
      }
      return []
    },
  })
}
