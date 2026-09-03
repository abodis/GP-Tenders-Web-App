import { useQuery } from '@tanstack/react-query'
import { getTenderAudit } from '@/api/endpoints'

export function useTenderAudit(
  sourceId: string,
  tenderId: string,
  options?: { step?: string; enabled?: boolean }
) {
  return useQuery({
    queryKey: ['tenderAudit', sourceId, tenderId, { step: options?.step }],
    queryFn: () => getTenderAudit(sourceId, tenderId, options?.step ? { step: options.step } : undefined),
    enabled: options?.enabled ?? true,
  })
}
