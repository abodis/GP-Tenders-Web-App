import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { TenderDetailResponse } from '@/api/types'

// Mock zone components
vi.mock('@/components/tender-detail/header-zone', () => ({
  HeaderZone: () => <div data-testid="header-zone" />,
}))
vi.mock('@/components/tender-detail/verdict-zone', () => ({
  VerdictZone: () => <div data-testid="verdict-zone" />,
}))
vi.mock('@/components/tender-detail/match-fitness-tabs', () => ({
  MatchFitnessTabs: () => <div data-testid="match-fitness-tabs" />,
}))
vi.mock('@/components/tender-detail/details-section', () => ({
  DetailsSection: () => <div data-testid="details-section" />,
}))
vi.mock('@/components/tender-detail/developer-section', () => ({
  DeveloperSection: () => <div data-testid="developer-section" />,
}))

// Mock useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ sourceId: 'test-source', tenderId: 'test-tender' }),
  }
})

// Mock useTenderDetail
const mockUseTenderDetail = vi.fn()
vi.mock('@/hooks/useTenderDetail', () => ({
  useTenderDetail: (...args: unknown[]) => mockUseTenderDetail(...args),
}))

function createTender(overrides: Partial<TenderDetailResponse> = {}): TenderDetailResponse {
  return {
    pk: 'test#tender',
    source_id: 'test-source',
    tender_id: 'test-tender',
    title: 'Test Tender',
    posted_date: '2025-01-01',
    deadline: '2025-03-01',
    discovered_at: '2025-01-01T00:00:00Z',
    status: 'completed',
    fully_visible: true,
    budget: 100000,
    currency: 'EUR',
    status_name: null,
    location_names: 'Romania',
    sectors: null,
    types: null,
    documents_total: 0,
    relevance_score: null,
    analysis_summary: null,
    analysis_tags: [],
    tender_type: null,
    analyzed_at: null,
    organization: 'Test Org',
    interestingness_score: null,
    unified_score: null,
    skip_reason: null,
    retry_count: 0,
    last_attempt: null,
    last_error: null,
    s3_prefix: null,
    documents_downloaded: 0,
    documents_failed: 0,
    discovered_run_id: null,
    processed_run_id: null,
    detail: null,
    description_text: 'A test description',
    warnings: [],
    analysis_context: null,
    analysis_model: null,
    emailed_at: null,
    experts_required: null,
    references_required: null,
    turnover_required: null,
    team_requirements: null,
    team_match_result: null,
    reference_requirements: null,
    reference_match_result: null,
    exclusion_result: null,
    feedback_type: null,
    interestingness_reasoning: null,
    ...overrides,
  }
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/tenders/test-source/test-tender']}>
        <TenderDetailPageWrapper />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// Lazy import to allow mocks to be set up first
let TenderDetailPage: typeof import('./TenderDetailPage').default

function TenderDetailPageWrapper() {
  return <TenderDetailPage />
}

beforeEach(async () => {
  vi.clearAllMocks()
  const mod = await import('./TenderDetailPage')
  TenderDetailPage = mod.default
})

describe('TenderDetailPage composition', () => {
  // **Validates: Requirements 9.1**
  it('unanalyzed state renders header-zone and details-section only', () => {
    const tender = createTender()
    mockUseTenderDetail.mockReturnValue({
      data: tender,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    renderPage()

    expect(screen.getByTestId('header-zone')).toBeInTheDocument()
    expect(screen.getByTestId('details-section')).toBeInTheDocument()
    expect(screen.queryByTestId('verdict-zone')).not.toBeInTheDocument()
    expect(screen.queryByTestId('match-fitness-tabs')).not.toBeInTheDocument()
    expect(screen.queryByTestId('developer-section')).not.toBeInTheDocument()
  })

  // **Validates: Requirements 9.2**
  it('legacy_analyzed state renders all zones', () => {
    const tender = createTender({
      experts_required: { international: 2, local: 3, key_experts: 1, total: 5, notes: 'notes' },
      unified_score: 6.5,
      analysis_summary: 'A summary',
      analyzed_at: '2025-01-15T00:00:00Z',
    })
    mockUseTenderDetail.mockReturnValue({
      data: tender,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    renderPage()

    expect(screen.getByTestId('header-zone')).toBeInTheDocument()
    expect(screen.getByTestId('verdict-zone')).toBeInTheDocument()
    expect(screen.getByTestId('match-fitness-tabs')).toBeInTheDocument()
    expect(screen.getByTestId('details-section')).toBeInTheDocument()
    expect(screen.getByTestId('developer-section')).toBeInTheDocument()
  })

  // **Validates: Requirements 9.3**
  it('fully_analyzed state renders all zones', () => {
    const tender = createTender({
      team_requirements: {
        team_requirements: [],
        total_experts_required: 3,
        extraction_confidence: 'high',
      },
      unified_score: 8.0,
      analysis_context: 'Context text',
      analyzed_at: '2025-01-20T00:00:00Z',
    })
    mockUseTenderDetail.mockReturnValue({
      data: tender,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    renderPage()

    expect(screen.getByTestId('header-zone')).toBeInTheDocument()
    expect(screen.getByTestId('verdict-zone')).toBeInTheDocument()
    expect(screen.getByTestId('match-fitness-tabs')).toBeInTheDocument()
    expect(screen.getByTestId('details-section')).toBeInTheDocument()
    expect(screen.getByTestId('developer-section')).toBeInTheDocument()
  })

  // **Validates: Requirements 9.4**
  it('skipped state triggers redirect and renders no zones', () => {
    const tender = createTender({ skip_reason: 'Budget too low' })
    mockUseTenderDetail.mockReturnValue({
      data: tender,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    renderPage()

    expect(screen.queryByTestId('header-zone')).not.toBeInTheDocument()
    expect(screen.queryByTestId('verdict-zone')).not.toBeInTheDocument()
    expect(screen.queryByTestId('match-fitness-tabs')).not.toBeInTheDocument()
    expect(screen.queryByTestId('details-section')).not.toBeInTheDocument()
    expect(screen.queryByTestId('developer-section')).not.toBeInTheDocument()
  })

  // **Validates: Requirements 9.5**
  it('renders warnings banner when warnings array is non-empty', () => {
    const tender = createTender({
      warnings: ['Deadline passed', 'Budget unclear'],
    })
    mockUseTenderDetail.mockReturnValue({
      data: tender,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    renderPage()

    expect(screen.getByText('Warnings')).toBeInTheDocument()
    expect(screen.getByText('Deadline passed')).toBeInTheDocument()
    expect(screen.getByText('Budget unclear')).toBeInTheDocument()
  })

  it('does not render warnings banner when warnings array is empty', () => {
    const tender = createTender({ warnings: [] })
    mockUseTenderDetail.mockReturnValue({
      data: tender,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    renderPage()

    expect(screen.queryByText('Warnings')).not.toBeInTheDocument()
  })
})
