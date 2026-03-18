// === Pagination ===

export interface PaginatedResponse<T> {
  items: T[]
  count: number
  total_count: number | null
  next_cursor: string | null
}

export interface ErrorResponse {
  detail: string
  status_code: number
}

// === Tenders ===

export interface TenderListItem {
  source_id: string
  tender_id: string
  title: string
  posted_date: string
  deadline: string | null
  discovered_at: string
  status: string
  fully_visible: boolean
  budget: number
  currency: string | null
  status_name: string | null
  location_names: string | null
  sectors: string | null
  types: string | null
  documents_total: number
  relevance_score: number | null
  analysis_summary: string | null
  analysis_tags: string[]
  tender_type: string | null
  analyzed_at: string | null
  organization: string | null
}

export interface TenderDetailResponse extends TenderListItem {
  pk: string
  retry_count: number
  last_attempt: string | null
  last_error: string | null
  s3_prefix: string | null
  documents_downloaded: number
  documents_failed: number
  skip_reason: string | null
  discovered_run_id: string | null
  processed_run_id: string | null
  detail: Record<string, unknown> | null
  description_text: string | null
  warnings: string[]
  analysis_context: string | null
  analysis_model: string | null
  emailed_at: string | null
  experts_required: ExpertsRequired | null
  references_required: ReferencesRequired | null
  turnover_required: TurnoverRequired | null
}

export interface ExpertsRequired {
  international: number
  local: number
  key_experts: number
  total: number
  notes: string | null
}

export interface ReferencesRequired {
  count: number
  type: string
  value_eur: number
  timeline_years: number
  notes: string | null
}

export interface TurnoverRequired {
  annual_eur: number
  years: number
  notes: string | null
}

// === Documents ===

export interface DocumentItem {
  filename: string
  url: string
  size_bytes: number | null
}

// === Sources ===

export interface SourceListItem {
  source_id: string
  enabled: boolean
  base_url: string
}

// === Runs ===

export interface CollectorResult {
  total_found: number
  new_tenders: number
  new_pending: number
  new_skipped: number
  duplicates: number
  errors: number
}

export interface RetrieverResult {
  processed: number
  successful: number
  failed: number
  permanently_failed: number
  documents_downloaded: number
  documents_failed: number
}

export interface RunItem {
  pk: string
  source_id: string
  run_date: string
  started_at: string
  completed_at: string | null
  status: string
  collector_result: CollectorResult | null
  retriever_result: RetrieverResult | null
}

// === Query Params ===

export interface TenderListParams {
  source_id?: string
  discovered_from?: string
  discovered_to?: string
  status?: string
  fully_visible?: string
  analyzed?: string
  min_score?: string
  tender_type?: string
  sort_by?: string
  sort_direction?: string
  page_size?: string
  cursor?: string
}

export interface PaginationParams {
  page_size?: string
  cursor?: string
}
