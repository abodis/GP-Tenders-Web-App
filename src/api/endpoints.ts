import { apiFetch, apiPut } from '@/api/client'
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
