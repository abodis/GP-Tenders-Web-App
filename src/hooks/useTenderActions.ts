import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  extractTeamRequirements,
  runTeamMatch,
  extractReferenceRequirements,
  runReferenceMatch,
  checkExclusion,
} from '@/api/endpoints'

export function useTenderActions(sourceId: string, tenderId: string) {
  const queryClient = useQueryClient()
  const queryKey = ['tenderDetail', sourceId, tenderId]

  const extractTeam = useMutation({
    mutationFn: () => extractTeamRequirements(sourceId, tenderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const teamMatch = useMutation({
    mutationFn: () => runTeamMatch(sourceId, tenderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const extractReferences = useMutation({
    mutationFn: () => extractReferenceRequirements(sourceId, tenderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const referenceMatch = useMutation({
    mutationFn: () => runReferenceMatch(sourceId, tenderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const exclusionCheck = useMutation({
    mutationFn: () => checkExclusion(sourceId, tenderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  return { extractTeam, teamMatch, extractReferences, referenceMatch, exclusionCheck }
}
