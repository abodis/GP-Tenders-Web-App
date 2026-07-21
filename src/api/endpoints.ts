import { apiFetch, apiPut, apiPost, apiDelete, apiUpload } from '@/api/client'
import type {
  PaginatedResponse,
  PaginationParams,
  RunItem,
  SourceListItem,
  TenderDetailResponse,
  TenderListItem,
  TenderListParams,
  DocumentItem,
  SettingsListResponse,
  SettingType,
  SettingResponse,
  TeamListParams,
  TeamMemberListItem,
  TeamMemberResponse,
  TeamMemberCreate,
  TeamMemberUpdate,
  TeamMemberCvResponse,
  ReferenceListParams,
  ReferenceListItem,
  ReferenceResponse,
  ReferenceCreate,
  ReferenceUpdate,
} from '@/api/types'

export function getTenders(
  params?: TenderListParams,
): Promise<PaginatedResponse<TenderListItem>> {
  return apiFetch<PaginatedResponse<TenderListItem>>('/tenders', params ? { ...params } : undefined)
}

export function getTenderDetail(
  sourceId: string,
  tenderId: string,
): Promise<TenderDetailResponse> {
  return apiFetch<TenderDetailResponse>(`/tenders/${sourceId}/${tenderId}`)
}

export function getTenderDocuments(
  sourceId: string,
  tenderId: string,
): Promise<PaginatedResponse<DocumentItem>> {
  return apiFetch<PaginatedResponse<DocumentItem>>(
    `/tenders/${sourceId}/${tenderId}/documents`,
  )
}

export function getSources(): Promise<SourceListItem[]> {
  return apiFetch<SourceListItem[]>('/sources/')
}

export function getSourceRuns(
  sourceId: string,
  params?: PaginationParams,
): Promise<PaginatedResponse<RunItem>> {
  return apiFetch<PaginatedResponse<RunItem>>(
    `/sources/${sourceId}/runs`,
    params ? { ...params } : undefined,
  )
}

export function getRunDetail(
  sourceId: string,
  runDate: string,
): Promise<RunItem> {
  return apiFetch<RunItem>(`/sources/${sourceId}/runs/${runDate}`)
}

export function getRunTenders(
  sourceId: string,
  runDate: string,
  phase: 'discovered' | 'processed',
  params?: PaginationParams,
): Promise<PaginatedResponse<TenderListItem>> {
  return apiFetch<PaginatedResponse<TenderListItem>>(
    `/sources/${sourceId}/runs/${runDate}/tenders`,
    { phase, ...(params ? { ...params } : {}) },
  )
}

export function getSettings(): Promise<SettingsListResponse> {
  return apiFetch<SettingsListResponse>('/settings')
}

export function putSetting<T extends SettingResponse>(
  type: SettingType,
  body: Omit<T, 'setting_type' | 'updated_at'>,
): Promise<T> {
  return apiPut<T>(`/settings/${type}`, body)
}

// === Team Members ===

export function getTeamMembers(
  params?: TeamListParams,
): Promise<PaginatedResponse<TeamMemberListItem>> {
  return apiFetch<PaginatedResponse<TeamMemberListItem>>(
    '/team',
    params ? { ...params } : undefined,
  )
}

export function getTeamMember(id: string): Promise<TeamMemberResponse> {
  return apiFetch<TeamMemberResponse>(`/team/${id}`)
}

export function createTeamMember(
  body: TeamMemberCreate,
): Promise<TeamMemberResponse> {
  return apiPost<TeamMemberResponse>('/team', body)
}

export function updateTeamMember(
  id: string,
  body: TeamMemberUpdate,
): Promise<TeamMemberResponse> {
  return apiPut<TeamMemberResponse>(`/team/${id}`, body)
}

export function deleteTeamMember(id: string): Promise<void> {
  return apiDelete(`/team/${id}`)
}

export function uploadTeamMemberCv(
  id: string,
  file: File,
): Promise<TeamMemberResponse> {
  const formData = new FormData()
  formData.append('file', file)
  return apiUpload<TeamMemberResponse>(`/team/${id}/cv`, formData)
}

export function getTeamMemberCv(id: string): Promise<TeamMemberCvResponse> {
  return apiFetch<TeamMemberCvResponse>(`/team/${id}/cv`)
}

// === References ===

export function getReferences(
  params?: ReferenceListParams,
): Promise<PaginatedResponse<ReferenceListItem>> {
  return apiFetch<PaginatedResponse<ReferenceListItem>>(
    '/references',
    params ? { ...params } : undefined,
  )
}

export function getReference(id: string): Promise<ReferenceResponse> {
  return apiFetch<ReferenceResponse>(`/references/${id}`)
}

export function createReference(body: ReferenceCreate): Promise<ReferenceResponse> {
  return apiPost<ReferenceResponse>('/references', body)
}

export function updateReference(id: string, body: ReferenceUpdate): Promise<ReferenceResponse> {
  return apiPut<ReferenceResponse>(`/references/${id}`, body)
}

export function deleteReference(id: string): Promise<void> {
  return apiDelete(`/references/${id}`)
}

export function uploadReferenceDocument(id: string, file: File): Promise<ReferenceResponse> {
  const formData = new FormData()
  formData.append('file', file)
  return apiUpload<ReferenceResponse>(`/references/${id}/document`, formData)
}

export function deleteReferenceDocument(id: string, filename: string): Promise<void> {
  return apiDelete(`/references/${id}/document/${filename}`)
}

export function extractReference(id: string): Promise<ReferenceResponse> {
  return apiPost<ReferenceResponse>(`/references/${id}/extract`, {})
}
