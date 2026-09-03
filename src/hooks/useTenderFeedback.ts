import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitFeedback, deleteFeedback } from '@/api/endpoints'
import type { TenderDetailResponse } from '@/api/types'

export function useTenderFeedback(sourceId: string, tenderId: string) {
  const queryClient = useQueryClient()
  const queryKey = ['tenderDetail', sourceId, tenderId]

  const submitMutation = useMutation({
    mutationFn: (feedbackType: 'interesting' | 'boring') =>
      submitFeedback(sourceId, tenderId, { feedback_type: feedbackType }),
    onMutate: async (feedbackType) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<TenderDetailResponse>(queryKey)
      queryClient.setQueryData<TenderDetailResponse>(queryKey, (old) =>
        old ? { ...old, feedback_type: feedbackType } : old
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteFeedback(sourceId, tenderId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<TenderDetailResponse>(queryKey)
      queryClient.setQueryData<TenderDetailResponse>(queryKey, (old) =>
        old ? { ...old, feedback_type: null } : old
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  return { submitMutation, deleteMutation }
}
