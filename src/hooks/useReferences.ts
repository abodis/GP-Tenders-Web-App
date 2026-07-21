import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import {
  getReferences,
  getReference,
  createReference,
  updateReference,
  deleteReference,
  uploadReferenceDocument,
  deleteReferenceDocument,
  extractReference,
} from '@/api/endpoints'
import type { ReferenceCreate, ReferenceUpdate } from '@/api/types'

export function useReferenceList(search?: string, sector?: string, year?: string) {
  return useInfiniteQuery({
    queryKey: ['references', { search, sector, year }],
    queryFn: ({ pageParam }) =>
      getReferences({ page: String(pageParam), search, sector, year }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.total_pages !== null && lastPage.page < lastPage.total_pages
        ? lastPage.page + 1
        : undefined,
  })
}

export function useReferenceDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['reference', id],
    queryFn: () => getReference(id!),
    enabled: !!id,
  })
}

export function useCreateReference() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: ReferenceCreate) => createReference(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['references'] })
    },
  })
}

export function useUpdateReference() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReferenceUpdate }) =>
      updateReference(id, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['references'] })
      queryClient.invalidateQueries({ queryKey: ['reference', variables.id] })
    },
  })
}

export function useDeleteReference() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteReference(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['references'] })
    },
  })
}

export function useUploadDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      uploadReferenceDocument(id, file),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reference', variables.id] })
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, filename }: { id: string; filename: string }) =>
      deleteReferenceDocument(id, filename),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reference', variables.id] })
    },
  })
}

export function useExtractReference() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => extractReference(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reference', variables] })
    },
  })
}
