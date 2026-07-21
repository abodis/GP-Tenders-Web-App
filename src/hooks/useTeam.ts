import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import {
  getTeamMembers,
  getTeamMember,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  uploadTeamMemberCv,
} from '@/api/endpoints'
import type { TeamMemberType, TeamMemberCreate, TeamMemberUpdate } from '@/api/types'

export function useTeamList(type?: TeamMemberType, search?: string) {
  return useInfiniteQuery({
    queryKey: ['team-members', { type, search }],
    queryFn: ({ pageParam }) =>
      getTeamMembers({ page: String(pageParam), type, q: search }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.total_pages !== null && lastPage.page < lastPage.total_pages
        ? lastPage.page + 1
        : undefined,
  })
}

export function useTeamDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['team-member', id],
    queryFn: () => getTeamMember(id!),
    enabled: !!id,
  })
}

export function useCreateMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: TeamMemberCreate) => createTeamMember(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
    },
  })
}

export function useUpdateMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TeamMemberUpdate }) =>
      updateTeamMember(id, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      queryClient.invalidateQueries({ queryKey: ['team-member', variables.id] })
    },
  })
}

export function useDeleteMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteTeamMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
    },
  })
}

export function useUploadCv() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      uploadTeamMemberCv(id, file),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team-member', variables.id] })
    },
  })
}
