import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTenderDocuments } from '@/api/endpoints'
import { isPresignedUrlExpired } from '@/utils/expiry'

export function useTenderDocuments(sourceId: string, tenderId: string) {
  const fetchTimestampRef = useRef<number>(0)

  const query = useQuery({
    queryKey: ['tenderDocuments', sourceId, tenderId],
    queryFn: () => getTenderDocuments(sourceId, tenderId),
  })

  // Update timestamp whenever fresh data arrives
  useEffect(() => {
    if (query.data) {
      fetchTimestampRef.current = Date.now()
    }
  }, [query.data])

  const refreshIfExpired = async () => {
    if (
      fetchTimestampRef.current > 0 &&
      isPresignedUrlExpired(fetchTimestampRef.current, Date.now())
    ) {
      await query.refetch()
    }
  }

  return {
    ...query,
    fetchTimestamp: fetchTimestampRef,
    refreshIfExpired,
  }
}
