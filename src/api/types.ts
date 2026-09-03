// === Pagination ===

export interface PaginatedResponse<T> {
  items: T[]
  count: number
  total_count: number | null
  page: number
  total_pages: number | null
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
  interestingness_score: number | null
  unified_score: number | null
  skip_reason: string | null
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
  team_requirements: TeamRequirementsData | null
  team_match_result: TeamMatchResult | null
  reference_requirements: ReferenceRequirementsData | null
  reference_match_result: ReferenceMatchResult | null
  exclusion_result: ExclusionResult | null
  feedback_type: 'interesting' | 'boring' | null
  interestingness_reasoning: string | null
}

// --- Team Requirements ---

export interface TeamRequirement {
  role: string
  specializations: string[]
  mandatory: boolean
  min_years: number | null
  languages: string[]
  notes: string | null
}

export interface TeamRequirementsData {
  team_requirements: TeamRequirement[]
  total_experts_required: number | null
  extraction_confidence: 'high' | 'medium' | 'low'
}

export interface TeamRequirementsExtractionResponse extends TeamRequirementsData {
  extraction_source: 'documents' | 'description'
  documents_used: string[]
}

// --- Team Match ---

export interface BestMatch {
  id: string
  name: string
  type: 'employee' | 'contractor'
  match_score: number
  duplicate_roles: string[]
}

export interface RoleMatch {
  required_role: string
  mandatory: boolean
  best_match: BestMatch | null
  match_score: number
  status: 'matched' | 'partial' | 'gap'
}

export interface GapEntry {
  role: string
  mandatory: boolean
  severity: 'high' | 'low'
}

export interface TeamMatchResult {
  team_match_score: number
  role_matches: RoleMatch[]
  gaps: GapEntry[]
  external_experts_needed: number
  message: string | null
}

// --- Reference Requirements ---

export interface ReferenceRequirement {
  domain: string
  min_projects: number | null
  min_value_eur: number | null
  max_age_years: number | null
  region: string | null
  donor_preference: string | null
  mandatory: boolean
  notes: string | null
}

export interface ReferenceRequirementsData {
  reference_requirements: ReferenceRequirement[]
  total_references_required: number | null
  extraction_confidence: 'high' | 'medium' | 'low'
}

export interface ReferenceRequirementsExtractionResponse extends ReferenceRequirementsData {
  extraction_source: 'documents' | 'description'
  documents_used: string[]
}

// --- Reference Match ---

export interface ReferenceBestMatch {
  id: string
  title: string
  match_score: number
  match_factors: Record<string, number>
  consortium_coverage: boolean
}

export interface RequirementMatch {
  domain: string
  mandatory: boolean
  best_matches: ReferenceBestMatch[]
  status: 'matched' | 'partial' | 'gap'
  coverage_count: number
  gap_note: string | null
}

export interface ReferenceGapEntry {
  domain: string
  mandatory: boolean
  severity: 'high' | 'low'
}

export interface ReferenceMatchResult {
  reference_match_score: number
  requirement_matches: RequirementMatch[]
  gaps: ReferenceGapEntry[]
  consortium_note: string | null
  message: string | null
}

// --- Exclusion ---

export type ExclusionCategory =
  | 'financial' | 'legal' | 'experience'
  | 'accreditation' | 'geographic' | 'consortium' | 'capacity'

export interface ExclusionCriterion {
  criterion: string
  category: ExclusionCategory
  assessment: 'pass' | 'fail' | 'uncertain'
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

export interface ExclusionResult {
  criteria: ExclusionCriterion[]
  excluded: boolean
  exclusion_reasons: string[]
  uncertain_flags: string[]
  extraction_confidence: 'high' | 'medium' | 'low'
}

export interface ExclusionResultResponse extends ExclusionResult {
  extraction_source: 'documents' | 'description'
  documents_used: string[]
}

// --- Audit ---

export interface AuditRecord {
  id: string
  step: string
  run_id: string | null
  created_at: string
  input_snapshot: Record<string, unknown>
  output: Record<string, unknown>
  model: string | null
  model_version: string | null
  duration_ms: number | null
}

// --- Feedback ---

export interface FeedbackRequest {
  feedback_type: 'interesting' | 'boring'
}

export interface FeedbackResponse {
  pk: string
  source_id: string
  tender_id: string
  feedback_type: string
  created_at: string
}

// --- Legacy Analysis Fields ---

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
  page?: string
  q?: string
  min_interestingness?: string
}

export interface PaginationParams {
  page_size?: string
  page?: string
}

// === Settings ===

export type SettingType = 'selection-criteria' | 'analysis' | 'company-profile' | 'recipients' | 'interestingness' | 'digest'

export interface SelectionCriteriaSettings {
  setting_type: 'selection-criteria'
  updated_at: string
  min_budget_eur: number
  max_budget_eur: number
  min_days_publish_to_deadline: number
  locations_include: string[]
  status_include: string[]
}

export interface AnalysisSettings {
  setting_type: 'analysis'
  updated_at: string
  score_threshold_for_email: number
  max_tenders_per_run: number
  scoring_criteria: string[]
}

export interface CompanyProfileSettings {
  setting_type: 'company-profile'
  updated_at: string
  company_name: string
  description: string
  focus_areas: string[]
  preferred_regions: string[]
  typical_budget_range: { min_eur: number; max_eur: number }
  typical_team_size: string
}

export interface RecipientsSettings {
  setting_type: 'recipients'
  updated_at: string
  recipients: string[]
}

export interface InterestingnessSettings {
  setting_type: 'interestingness'
  updated_at: string
  interest_profile: string
  scoring_criteria: string[]
  interestingness_top_n: number
  interestingness_min_score: number
}

export interface DigestSettings {
  setting_type: 'digest'
  updated_at: string
  score_threshold_top: number
  score_threshold_floor: number
  max_worth_a_look: number
  max_excluded_shown: number
}

export type SettingResponse =
  | SelectionCriteriaSettings
  | AnalysisSettings
  | CompanyProfileSettings
  | RecipientsSettings
  | InterestingnessSettings
  | DigestSettings

export interface SettingsListResponse {
  items: SettingResponse[]
  count: number
}

// === Team Members ===

export type TeamMemberType = 'employee' | 'contractor'
export type ExtractionStatus = 'pending' | 'completed' | 'failed'

export interface TeamMemberListItem {
  id: string
  name: string
  email: string
  type: TeamMemberType
  roles: string[]
  extraction_status: ExtractionStatus | null
}

export interface TeamMemberResponse extends TeamMemberListItem {
  phone: string | null
  specializations: string[]
  languages: string[]
  notes: string | null
  cv_s3_key: string | null
  created_at: string
  updated_at: string
}

export interface TeamMemberCreate {
  name: string
  email: string
  type: TeamMemberType
  roles?: string[]
}

export interface TeamMemberUpdate {
  name?: string
  email?: string
  phone?: string
  type?: TeamMemberType
  roles?: string[]
  specializations?: string[]
  languages?: string[]
  notes?: string
}

export interface TeamListParams {
  page?: string
  page_size?: string
  type?: TeamMemberType
  q?: string
}

export interface TeamMemberCvResponse {
  filename: string
  presigned_url: string
}

// === References ===

export type ReferenceExtractionStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface EnrichedExpert {
  id: string
  name: string
  roles: string[]
}

export interface DocumentInfo {
  filename: string
  presigned_url: string
}

export interface ExtractedFields {
  themes?: string[]
  donor?: string
  countries?: string[]
  type?: string
  key_deliverables?: string[]
  /** API returns an object with EUR min/max, not a string. Nullable. */
  budget_range?: { min: number | null; max: number | null } | null
  year?: number | null
}

export interface ReferenceListItem {
  id: string
  title: string
  client: string | null
  sector: string | null
  year: number | null
  budget_eur: number | null
  extraction_status: ReferenceExtractionStatus | null
}

export interface ReferenceResponse extends ReferenceListItem {
  region: string | null
  description: string | null
  experts_involved: string[]
  enriched_experts: EnrichedExpert[]
  consortium_partners: string[]
  documents: string[]
  document_urls: DocumentInfo[]
  knowledge_s3_key: string | null
  extracted_fields: ExtractedFields | null
  slug: string
  created_at: string
  updated_at: string
}

export interface ReferenceCreate {
  title: string
  client?: string
  sector?: string
  region?: string
  year?: number
  budget_eur?: number
  description?: string
  experts_involved?: string[]
  consortium_partners?: string[]
}

export interface ReferenceUpdate {
  title?: string
  client?: string
  sector?: string
  region?: string
  year?: number
  budget_eur?: number
  description?: string
  experts_involved?: string[]
  consortium_partners?: string[]
}

export interface ReferenceListParams {
  page?: string
  page_size?: string
  search?: string
  sector?: string
  year?: string
}
