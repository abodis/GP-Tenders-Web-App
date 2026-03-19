import { useEffect, useState } from 'react'
import { useSettings, useSaveSetting } from '@/hooks/useSettings'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorAlert } from '@/components/ErrorAlert'
import { InfoTooltip } from '@/components/InfoTooltip'
import { getErrorMessage } from '@/utils/errors'
import { formatDateTime } from '@/utils/formatting'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { TagInput } from '@/components/TagInput'
import { Check } from 'lucide-react'
import type {
  SelectionCriteriaSettings,
  AnalysisSettings,
  CompanyProfileSettings,
  RecipientsSettings,
} from '@/api/types'

function validateEmail(email: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : 'Invalid email address'
}

// --- Section wrapper with save button + feedback ---

interface SectionProps {
  title: string
  description: string
  badge?: 'filter' | 'scoring'
  updatedAt: string | undefined
  isPending: boolean
  isSuccess: boolean
  error: Error | null
  onSave: () => void
  disabled?: boolean
  children: React.ReactNode
}

function Section({ title, description, badge, updatedAt, isPending, isSuccess, error, onSave, disabled, children }: SectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle>{title}</CardTitle>
              {badge === 'filter' && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  Hard filter
                </span>
              )}
              {badge === 'scoring' && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                  Scoring signal
                </span>
              )}
            </div>
            <CardDescription>{description}</CardDescription>
          </div>
          {updatedAt && (
            <span className="shrink-0 text-xs text-muted-foreground">
              Last saved: {formatDateTime(updatedAt)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        {error && (
          <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
        )}
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={onSave} disabled={disabled || isPending}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
          {isSuccess && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check className="size-4" /> Saved
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// --- Field helper with optional tooltip hint ---

interface FieldProps {
  label: string
  htmlFor: string
  hint?: string
  error?: string | null
  children: React.ReactNode
}

function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint && <InfoTooltip>{hint}</InfoTooltip>}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}


// Known status values from DevelopmentAid
const KNOWN_STATUSES = ['open', 'forecast']

// === Selection Criteria Section ===

function SelectionCriteriaSection({ data }: { data: SelectionCriteriaSettings }) {
  const [minBudget, setMinBudget] = useState(data.min_budget_eur)
  const [maxBudget, setMaxBudget] = useState(data.max_budget_eur)
  const [minDays, setMinDays] = useState(data.min_days_publish_to_deadline)
  const [locations, setLocations] = useState(data.locations_include)
  const [statuses, setStatuses] = useState(data.status_include)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const mutation = useSaveSetting<SelectionCriteriaSettings>('selection-criteria')

  useEffect(() => {
    setMinBudget(data.min_budget_eur)
    setMaxBudget(data.max_budget_eur)
    setMinDays(data.min_days_publish_to_deadline)
    setLocations(data.locations_include)
    setStatuses(data.status_include)
  }, [data])

  function handleSave() {
    const errs: Record<string, string> = {}
    if (minBudget < 0) errs.minBudget = 'Must be ≥ 0'
    if (maxBudget <= 0) errs.maxBudget = 'Must be > 0'
    if (maxBudget <= minBudget) errs.maxBudget = 'Must be greater than min budget'
    if (minDays < 0) errs.minDays = 'Must be ≥ 0'
    if (locations.length === 0) errs.locations = 'At least one location required'
    if (statuses.length === 0) errs.statuses = 'At least one status required'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    mutation.mutate({
      min_budget_eur: minBudget,
      max_budget_eur: maxBudget,
      min_days_publish_to_deadline: minDays,
      locations_include: locations,
      status_include: statuses,
    })
  }

  // Suggest known statuses that aren't already added
  const statusSuggestions = KNOWN_STATUSES.filter((s) => !statuses.includes(s))

  return (
    <Section
      title="Selection Criteria"
      description="Tenders failing any of these criteria are skipped during scraping and never reach the analyzer."
      badge="filter"
      updatedAt={data.updated_at}
      isPending={mutation.isPending}
      isSuccess={mutation.isSuccess}
      error={mutation.error}
      onSave={handleSave}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Min budget (EUR)"
          htmlFor="sc-min-budget"
          hint="Tenders with a stated budget below this are filtered out. Tenders with no budget always pass this filter."
          error={errors.minBudget}
        >
          <Input
            id="sc-min-budget"
            type="number"
            min={0}
            step={1000}
            value={minBudget}
            onChange={(e) => setMinBudget(Number(e.target.value))}
          />
        </Field>
        <Field
          label="Max budget (EUR)"
          htmlFor="sc-max-budget"
          hint="Tenders with a stated budget above this are filtered out. Tenders with no budget always pass this filter."
          error={errors.maxBudget}
        >
          <Input
            id="sc-max-budget"
            type="number"
            min={1}
            step={1000}
            value={maxBudget}
            onChange={(e) => setMaxBudget(Number(e.target.value))}
          />
        </Field>
        <Field
          label="Min days to deadline"
          htmlFor="sc-min-days"
          hint="Minimum days remaining until the tender deadline, counted from the scraper's run date. Set to 0 to disable."
          error={errors.minDays}
        >
          <Input
            id="sc-min-days"
            type="number"
            min={0}
            value={minDays}
            onChange={(e) => setMinDays(Number(e.target.value))}
          />
        </Field>
      </div>
      <Field
        label="Locations"
        htmlFor="sc-locations"
        hint={'Location keywords matched as case-insensitive substrings. The value "europe" expands server-side to all European countries and region terms (EU, Balkans, Eastern Europe, etc.).'}
        error={errors.locations}
      >
        <TagInput value={locations} onChange={setLocations} placeholder="Add a location…" />
      </Field>
      <Field
        label="Statuses to include"
        htmlFor="sc-statuses"
        hint="Which tender statuses to collect. Matched case-insensitively. Tenders with no status always pass."
        error={errors.statuses}
      >
        <TagInput value={statuses} onChange={setStatuses} placeholder="Add a status…" />
        {statusSuggestions.length > 0 && (
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-xs text-muted-foreground">Known values:</span>
            {statusSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatuses([...statuses, s])}
                className="rounded-md border border-dashed border-muted-foreground/30 px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-foreground/50 hover:text-foreground"
              >
                + {s}
              </button>
            ))}
          </div>
        )}
      </Field>
    </Section>
  )
}


// === Analysis Section ===

const SCORE_LABELS: Record<number, string> = {
  0: '0 — email everything',
  5: '5 — moderate',
  10: '10 — only top matches',
}

function AnalysisSection({ data }: { data: AnalysisSettings }) {
  const [threshold, setThreshold] = useState(data.score_threshold_for_email)
  const [maxTenders, setMaxTenders] = useState(data.max_tenders_per_run)
  const [criteria, setCriteria] = useState(data.scoring_criteria)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const mutation = useSaveSetting<AnalysisSettings>('analysis')

  useEffect(() => {
    setThreshold(data.score_threshold_for_email)
    setMaxTenders(data.max_tenders_per_run)
    setCriteria(data.scoring_criteria)
  }, [data])

  function handleSave() {
    const errs: Record<string, string> = {}
    if (threshold < 0 || threshold > 10) errs.threshold = 'Must be 0–10'
    if (maxTenders <= 0) errs.maxTenders = 'Must be > 0'
    if (maxTenders > 10000) errs.maxTenders = 'Must be ≤ 10,000'
    if (criteria.length === 0) errs.criteria = 'At least one criterion required'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    mutation.mutate({
      score_threshold_for_email: threshold,
      max_tenders_per_run: maxTenders,
      scoring_criteria: criteria,
    })
  }

  return (
    <Section
      title="Analysis"
      description="Controls the AI scoring pipeline. These settings influence how tenders are scored but don't filter them out."
      badge="scoring"
      updatedAt={data.updated_at}
      isPending={mutation.isPending}
      isSuccess={mutation.isSuccess}
      error={mutation.error}
      onSave={handleSave}
    >
      <Field
        label="Email score threshold"
        htmlFor="an-threshold"
        hint="Minimum relevance score (0–10) for a tender to be included in the email digest. Set to 0 to include everything."
        error={errors.threshold}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <input
              id="an-threshold"
              type="range"
              min={0}
              max={10}
              step={1}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
            <span className="w-8 text-center text-sm font-medium tabular-nums">{threshold}</span>
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            {Object.entries(SCORE_LABELS).map(([val, label]) => (
              <span key={val}>{label}</span>
            ))}
          </div>
        </div>
      </Field>
      <Field
        label="Max tenders per run"
        htmlFor="an-max"
        hint="Maximum tenders sent to the LLM per pipeline run. Acts as a cost and rate-limit safety cap."
        error={errors.maxTenders}
      >
        <Input
          id="an-max"
          type="number"
          min={1}
          max={10000}
          value={maxTenders}
          onChange={(e) => setMaxTenders(Number(e.target.value))}
        />
      </Field>
      <Field
        label="Scoring criteria"
        htmlFor="an-criteria"
        hint="Dimensions the LLM considers when scoring relevance (1–10). These are injected verbatim into the LLM prompt as a rubric."
        error={errors.criteria}
      >
        <TagInput value={criteria} onChange={setCriteria} placeholder="Add a criterion…" />
      </Field>
    </Section>
  )
}


// === Company Profile Section ===

function CompanyProfileSection({ data }: { data: CompanyProfileSettings }) {
  const [companyName, setCompanyName] = useState(data.company_name)
  const [description, setDescription] = useState(data.description)
  const [focusAreas, setFocusAreas] = useState(data.focus_areas)
  const [regions, setRegions] = useState(data.preferred_regions)
  const [budgetMin, setBudgetMin] = useState(data.typical_budget_range.min_eur)
  const [budgetMax, setBudgetMax] = useState(data.typical_budget_range.max_eur)
  const [teamSize, setTeamSize] = useState(data.typical_team_size)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const mutation = useSaveSetting<CompanyProfileSettings>('company-profile')

  useEffect(() => {
    setCompanyName(data.company_name)
    setDescription(data.description)
    setFocusAreas(data.focus_areas)
    setRegions(data.preferred_regions)
    setBudgetMin(data.typical_budget_range.min_eur)
    setBudgetMax(data.typical_budget_range.max_eur)
    setTeamSize(data.typical_team_size)
  }, [data])

  function handleSave() {
    const errs: Record<string, string> = {}
    if (!companyName.trim()) errs.companyName = 'Required'
    if (!description.trim()) errs.description = 'Required'
    if (focusAreas.length === 0) errs.focusAreas = 'At least one focus area required'
    if (regions.length === 0) errs.regions = 'At least one region required'
    if (budgetMin < 0) errs.budgetMin = 'Must be ≥ 0'
    if (budgetMax <= 0) errs.budgetMax = 'Must be > 0'
    if (budgetMax <= budgetMin) errs.budgetMax = 'Must be greater than min'
    if (!teamSize.trim()) errs.teamSize = 'Required'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    mutation.mutate({
      company_name: companyName.trim(),
      description: description.trim(),
      focus_areas: focusAreas,
      preferred_regions: regions,
      typical_budget_range: { min_eur: budgetMin, max_eur: budgetMax },
      typical_team_size: teamSize.trim(),
    })
  }

  return (
    <Section
      title="Company Profile"
      description="Context fed to the LLM so it can assess tender relevance against your company's capabilities."
      badge="scoring"
      updatedAt={data.updated_at}
      isPending={mutation.isPending}
      isSuccess={mutation.isSuccess}
      error={mutation.error}
      onSave={handleSave}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name" htmlFor="cp-name" hint="As it appears in LLM prompts and email digests." error={errors.companyName}>
          <Input
            id="cp-name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </Field>
        <Field label="Typical team size" htmlFor="cp-team" hint="Descriptive team size, informational for the LLM." error={errors.teamSize}>
          <Input
            id="cp-team"
            value={teamSize}
            onChange={(e) => setTeamSize(e.target.value)}
            placeholder="e.g. 3-10 experts"
          />
        </Field>
      </div>
      <Field label="Description" htmlFor="cp-desc" hint="Brief description of expertise and focus. Fed directly to the LLM for context." error={errors.description}>
        <Textarea
          id="cp-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Typical budget min (EUR)" htmlFor="cp-bmin" hint="Lower bound of your typical project budget. Informational for the LLM." error={errors.budgetMin}>
          <Input
            id="cp-bmin"
            type="number"
            min={0}
            step={1000}
            value={budgetMin}
            onChange={(e) => setBudgetMin(Number(e.target.value))}
          />
        </Field>
        <Field label="Typical budget max (EUR)" htmlFor="cp-bmax" hint="Upper bound of your typical project budget. Informational for the LLM." error={errors.budgetMax}>
          <Input
            id="cp-bmax"
            type="number"
            min={1}
            step={1000}
            value={budgetMax}
            onChange={(e) => setBudgetMax(Number(e.target.value))}
          />
        </Field>
      </div>
      <Field label="Focus areas" htmlFor="cp-focus" hint="Technical domains your company specializes in. Used by the LLM to assess sector fit." error={errors.focusAreas}>
        <TagInput value={focusAreas} onChange={setFocusAreas} placeholder="Add a focus area…" />
      </Field>
      <Field label="Preferred regions" htmlFor="cp-regions" hint="Geographic regions where your company prefers to work. Used by the LLM to assess geographic fit." error={errors.regions}>
        <TagInput value={regions} onChange={setRegions} placeholder="Add a region…" />
      </Field>
    </Section>
  )
}


// === Recipients Section ===

function RecipientsSection({ data }: { data: RecipientsSettings }) {
  const [recipients, setRecipients] = useState(data.recipients)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const mutation = useSaveSetting<RecipientsSettings>('recipients')

  useEffect(() => {
    setRecipients(data.recipients)
  }, [data])

  function handleSave() {
    const errs: Record<string, string> = {}
    if (recipients.length === 0) errs.recipients = 'At least one recipient required'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    mutation.mutate({ recipients })
  }

  return (
    <Section
      title="Email Recipients"
      description="Email addresses that receive the daily tender digest via SES."
      updatedAt={data.updated_at}
      isPending={mutation.isPending}
      isSuccess={mutation.isSuccess}
      error={mutation.error}
      onSave={handleSave}
    >
      <Field label="Recipients" htmlFor="rc-emails" hint="Must be valid email addresses. At least one is required." error={errors.recipients}>
        <TagInput
          value={recipients}
          onChange={setRecipients}
          placeholder="Add an email address…"
          validate={validateEmail}
        />
      </Field>
    </Section>
  )
}

// === Main Page ===

export default function SettingsPage() {
  const { data, isLoading, isError, error, refetch } = useSettings()

  if (isLoading) return <LoadingSpinner />
  if (isError) {
    return (
      <ErrorAlert
        message={getErrorMessage(error)}
        onRetry={() => { refetch() }}
      />
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure scraper filters, analysis pipeline, company profile, and email delivery.
        </p>
      </div>

      {data?.selectionCriteria && (
        <SelectionCriteriaSection data={data.selectionCriteria} />
      )}
      {data?.analysis && (
        <AnalysisSection data={data.analysis} />
      )}
      {data?.companyProfile && (
        <CompanyProfileSection data={data.companyProfile} />
      )}
      {data?.recipients && (
        <RecipientsSection data={data.recipients} />
      )}
    </div>
  )
}
