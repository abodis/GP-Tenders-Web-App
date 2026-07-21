import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useReferenceDetail, useUpdateReference, useUploadDocument, useDeleteDocument, useExtractReference, useDeleteReference } from '@/hooks/useReferences'
import { getTeamMembers } from '@/api/endpoints'
import { ApiError } from '@/api/client'
import { ErrorAlert } from '@/components/ErrorAlert'
import { getErrorMessage } from '@/utils/errors'
import { validateDocument } from '@/utils/document-validation'
import { formatDateTime } from '@/utils/formatting'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { ReferenceResponse, ReferenceUpdate, ReferenceExtractionStatus, EnrichedExpert, TeamMemberListItem } from '@/api/types'

function getExtractionBadgeClasses(status: ReferenceExtractionStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'processing':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    case 'failed':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  }
}

function getExtractionStatusLabel(status: ReferenceExtractionStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'processing':
      return 'Processing'
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
  }
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-10 w-24" />
    </div>
  )
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <h2 className="text-xl font-semibold">Reference not found</h2>
      <p className="text-sm text-muted-foreground">
        This reference doesn't exist or has been deleted.
      </p>
      <Link
        to="/references"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        ← Back to references
      </Link>
    </div>
  )
}

interface ToastState {
  message: string
  type: 'success' | 'error'
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    const duration = toast.type === 'success' ? 3000 : 5000
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 rounded-lg border px-4 py-3 text-sm shadow-lg ${toast.type === 'success'
        ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200'
        : 'border-destructive/50 bg-destructive/10 text-destructive'
        }`}
    >
      {toast.message}
    </div>
  )
}

function ReferenceForm({ reference }: { reference: ReferenceResponse }) {
  const [title, setTitle] = useState(reference.title)
  const [client, setClient] = useState(reference.client ?? '')
  const [sector, setSector] = useState(reference.sector ?? '')
  const [region, setRegion] = useState(reference.region ?? '')
  const [yearValue, setYearValue] = useState(reference.year !== null ? String(reference.year) : '')
  const [budgetValue, setBudgetValue] = useState(reference.budget_eur !== null ? String(reference.budget_eur) : '')
  const [description, setDescription] = useState(reference.description ?? '')
  const [consortiumPartners, setConsortiumPartners] = useState(reference.consortium_partners.join(', '))
  const [expertsInvolved, setExpertsInvolved] = useState<string[]>(reference.experts_involved)
  const [enrichedExperts, setEnrichedExperts] = useState<EnrichedExpert[]>(reference.enriched_experts)
  const [expertSearch, setExpertSearch] = useState('')
  const [debouncedExpertSearch, setDebouncedExpertSearch] = useState('')
  const [expertResults, setExpertResults] = useState<TeamMemberListItem[]>([])
  const [expertSearchLoading, setExpertSearchLoading] = useState(false)
  const [showExpertDropdown, setShowExpertDropdown] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<ToastState | null>(null)

  const navigate = useNavigate()
  const updateMutation = useUpdateReference()
  const uploadDocument = useUploadDocument()
  const deleteDocument = useDeleteDocument()
  const extractMutation = useExtractReference()
  const deleteMutation = useDeleteReference()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [docError, setDocError] = useState<string | null>(null)
  const [deleteDocFilename, setDeleteDocFilename] = useState<string | null>(null)

  // Re-sync form when reference data updates (e.g. after successful save)
  useEffect(() => {
    setTitle(reference.title)
    setClient(reference.client ?? '')
    setSector(reference.sector ?? '')
    setRegion(reference.region ?? '')
    setYearValue(reference.year !== null ? String(reference.year) : '')
    setBudgetValue(reference.budget_eur !== null ? String(reference.budget_eur) : '')
    setDescription(reference.description ?? '')
    setConsortiumPartners(reference.consortium_partners.join(', '))
    setExpertsInvolved(reference.experts_involved)
    setEnrichedExperts(reference.enriched_experts)
    setErrors({})
  }, [reference])

  // Debounce expert search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedExpertSearch(expertSearch), 300)
    return () => clearTimeout(timer)
  }, [expertSearch])

  // Fetch team members when debounced search changes
  useEffect(() => {
    if (!debouncedExpertSearch) {
      setExpertResults([])
      setShowExpertDropdown(false)
      return
    }
    setExpertSearchLoading(true)
    getTeamMembers({ q: debouncedExpertSearch, page_size: '20' })
      .then((response) => {
        setExpertResults(response.items)
        setShowExpertDropdown(true)
      })
      .catch(() => {
        setExpertResults([])
      })
      .finally(() => setExpertSearchLoading(false))
  }, [debouncedExpertSearch])

  function handleAddExpert(member: TeamMemberListItem) {
    if (expertsInvolved.includes(member.id)) return
    setExpertsInvolved([...expertsInvolved, member.id])
    setEnrichedExperts([...enrichedExperts, { id: member.id, name: member.name, roles: member.roles }])
    setExpertSearch('')
    setShowExpertDropdown(false)
  }

  function handleRemoveExpert(expertId: string) {
    setExpertsInvolved(expertsInvolved.filter((id) => id !== expertId))
    setEnrichedExperts(enrichedExperts.filter((e) => e.id !== expertId))
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}

    if (!title.trim()) {
      errs.title = 'Title is required'
    }

    if (yearValue.trim() !== '') {
      const y = Number(yearValue)
      if (!Number.isInteger(y) || y < 1990 || y > 2030) {
        errs.year = 'Year must be between 1990 and 2030'
      }
    }

    if (budgetValue.trim() !== '') {
      const b = Number(budgetValue)
      if (isNaN(b) || b < 0 || b > 999999999.99) {
        errs.budget = 'Budget must be between 0 and 999,999,999.99'
      }
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSave() {
    if (!validate()) return

    // Build partial update with only changed fields
    const body: ReferenceUpdate = {}

    if (title !== reference.title) body.title = title
    if (client !== (reference.client ?? '')) body.client = client
    if (sector !== (reference.sector ?? '')) body.sector = sector
    if (region !== (reference.region ?? '')) body.region = region

    const yearNum = yearValue.trim() !== '' ? Number(yearValue) : undefined
    const origYear = reference.year ?? undefined
    if (yearNum !== origYear) body.year = yearNum

    const budgetNum = budgetValue.trim() !== '' ? Number(budgetValue) : undefined
    const origBudget = reference.budget_eur ?? undefined
    if (budgetNum !== origBudget) body.budget_eur = budgetNum

    if (description !== (reference.description ?? '')) body.description = description

    const partnersArray = consortiumPartners.split(',').map((p) => p.trim()).filter(Boolean)
    if (JSON.stringify(partnersArray) !== JSON.stringify(reference.consortium_partners)) {
      body.consortium_partners = partnersArray
    }

    if (JSON.stringify(expertsInvolved) !== JSON.stringify(reference.experts_involved)) {
      body.experts_involved = expertsInvolved
    }

    // Nothing changed
    if (Object.keys(body).length === 0) {
      setToast({ message: 'No changes to save', type: 'success' })
      return
    }

    updateMutation.mutate(
      { id: reference.id, body },
      {
        onSuccess: () => {
          setErrors({})
          setToast({ message: 'Changes saved successfully', type: 'success' })
        },
        onError: (error) => {
          setToast({ message: getErrorMessage(error), type: 'error' })
        },
      },
    )
  }

  function handleDocumentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const validationError = validateDocument(file)
    if (validationError) {
      setDocError(validationError)
      return
    }

    setDocError(null)
    uploadDocument.mutate(
      { id: reference.id, file },
      {
        onError: (error) => {
          setDocError(getErrorMessage(error))
        },
      },
    )
  }

  function handleDeleteDocument() {
    if (!deleteDocFilename) return
    deleteDocument.mutate(
      { id: reference.id, filename: deleteDocFilename },
      {
        onSuccess: () => setDeleteDocFilename(null),
        onError: (error) => {
          setToast({ message: `Failed to delete document: ${getErrorMessage(error)}`, type: 'error' })
          setDeleteDocFilename(null)
        },
      },
    )
  }

  function handleReExtract() {
    extractMutation.mutate(reference.id, {
      onError: (error) => {
        setToast({ message: `Re-extraction failed: ${getErrorMessage(error)}`, type: 'error' })
      },
    })
  }

  function handleDeleteReference() {
    setDeleteError(null)
    deleteMutation.mutate(reference.id, {
      onSuccess: () => {
        navigate('/references')
      },
      onError: (error) => {
        setDeleteError(getErrorMessage(error))
      },
    })
  }

  return (
    <div className="space-y-6">
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{reference.title}</h1>
        <Link
          to="/references"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to references
        </Link>
      </div>

      {/* Editable fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ref-title">Title</Label>
          <Input
            id="ref-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ref-client">Client</Label>
          <Input
            id="ref-client"
            value={client}
            onChange={(e) => setClient(e.target.value)}
            maxLength={200}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ref-sector">Sector</Label>
          <Input
            id="ref-sector"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            maxLength={100}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ref-region">Region</Label>
          <Input
            id="ref-region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            maxLength={100}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ref-year">Year</Label>
          <Input
            id="ref-year"
            type="number"
            value={yearValue}
            onChange={(e) => setYearValue(e.target.value)}
          />
          {errors.year && <p className="text-xs text-destructive">{errors.year}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ref-budget">Budget (EUR)</Label>
          <Input
            id="ref-budget"
            type="number"
            step="0.01"
            value={budgetValue}
            onChange={(e) => setBudgetValue(e.target.value)}
          />
          {errors.budget && <p className="text-xs text-destructive">{errors.budget}</p>}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ref-partners">Consortium Partners (comma-separated)</Label>
          <Input
            id="ref-partners"
            value={consortiumPartners}
            onChange={(e) => setConsortiumPartners(e.target.value)}
            maxLength={1000}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ref-description">Description</Label>
        <Textarea
          id="ref-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={5000}
          rows={5}
        />
        <p className="text-xs text-muted-foreground">{description.length}/5000</p>
        {reference.document_urls.length > 0 && description !== (reference.description ?? '') && (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
            Saving will trigger re-extraction of reference documents.
          </div>
        )}
      </div>

      {/* Expert linking */}
      <div className="space-y-3">
        <Label>Experts Involved</Label>

        {/* Linked experts as chips */}
        {enrichedExperts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {enrichedExperts.map((expert) => (
              <span
                key={expert.id}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
              >
                {expert.name}
                {expert.roles.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({expert.roles.join(', ')})
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveExpert(expert.id)}
                  className="ml-1 text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${expert.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search input */}
        {expertsInvolved.length >= 50 ? (
          <p className="text-xs text-muted-foreground">Maximum of 50 experts reached</p>
        ) : (
          <div className="relative">
            <Input
              placeholder="Search team members..."
              value={expertSearch}
              onChange={(e) => setExpertSearch(e.target.value)}
              onFocus={() => { if (expertResults.length > 0) setShowExpertDropdown(true) }}
              onBlur={() => { setTimeout(() => setShowExpertDropdown(false), 200) }}
            />
            {expertSearchLoading && (
              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">Loading...</span>
            )}

            {/* Dropdown results */}
            {showExpertDropdown && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
                {expertResults.filter((m) => !expertsInvolved.includes(m.id)).length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No team members found</p>
                ) : (
                  expertResults
                    .filter((m) => !expertsInvolved.includes(m.id))
                    .map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleAddExpert(member)}
                      >
                        <span className="font-medium">{member.name}</span>
                        {member.roles.length > 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {member.roles.join(', ')}
                          </span>
                        )}
                      </button>
                    ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Document management */}
      <div className="space-y-3">
        <Label>Documents</Label>

        {reference.document_urls.length > 0 ? (
          <div className="space-y-2">
            {reference.document_urls.map((doc) => (
              <div key={doc.filename} className="flex items-center justify-between rounded-md border px-3 py-2">
                <a
                  href={doc.presigned_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {doc.filename}
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteDocFilename(doc.filename)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No documents uploaded</p>
        )}

        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleDocumentUpload}
            disabled={uploadDocument.isPending}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploadDocument.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadDocument.isPending ? 'Uploading…' : 'Upload Document'}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">PDF or DOCX, max 10MB</p>
          {docError && <p className="mt-1 text-xs text-destructive">{docError}</p>}
        </div>
      </div>

      {/* Extracted fields */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Extracted Data</h3>
        {(() => {
          const fields = reference.extracted_fields
          if (!fields) {
            return <p className="text-sm text-muted-foreground">No extracted data available</p>
          }

          const hasThemes = fields.themes && fields.themes.length > 0
          const hasDonor = fields.donor && fields.donor.trim() !== ''
          const hasCountries = fields.countries && fields.countries.length > 0
          const hasType = fields.type && fields.type.trim() !== ''
          const hasDeliverables = fields.key_deliverables && fields.key_deliverables.length > 0
          const hasBudgetRange = fields.budget_range && fields.budget_range.trim() !== ''

          if (!hasThemes && !hasDonor && !hasCountries && !hasType && !hasDeliverables && !hasBudgetRange) {
            return <p className="text-sm text-muted-foreground">No extracted data available</p>
          }

          return (
            <div className="space-y-3 rounded-lg border p-4">
              {hasThemes && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Themes</span>
                  <div className="flex flex-wrap gap-1">
                    {fields.themes!.map((theme) => (
                      <Badge key={theme} variant="secondary">{theme}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {hasDonor && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Donor</span>
                  <p className="text-sm">{fields.donor}</p>
                </div>
              )}

              {hasCountries && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Countries</span>
                  <p className="text-sm">{fields.countries!.join(', ')}</p>
                </div>
              )}

              {hasType && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Type</span>
                  <p className="text-sm">{fields.type}</p>
                </div>
              )}

              {hasDeliverables && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Key Deliverables</span>
                  <ul className="ml-4 list-disc text-sm">
                    {fields.key_deliverables!.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {hasBudgetRange && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Budget Range</span>
                  <p className="text-sm">{fields.budget_range}</p>
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* Read-only fields */}
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="text-sm font-medium text-muted-foreground">Read-only fields</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Extraction status</span>
            <div>
              {reference.extraction_status ? (
                <Badge
                  variant="outline"
                  className={getExtractionBadgeClasses(reference.extraction_status)}
                >
                  {getExtractionStatusLabel(reference.extraction_status)}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Created</span>
            <p className="text-sm">{formatDateTime(reference.created_at)}</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Updated</span>
            <p className="text-sm">{formatDateTime(reference.updated_at)}</p>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Saving…' : 'Save'}
        </Button>
        {reference.document_urls.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={handleReExtract}
            disabled={extractMutation.isPending || reference.extraction_status === 'pending'}
          >
            {extractMutation.isPending ? 'Re-extracting…' : 'Re-extract'}
          </Button>
        )}
        <Button
          type="button"
          variant="destructive"
          onClick={() => { setDeleteError(null); setDeleteDialogOpen(true) }}
        >
          Delete
        </Button>
      </div>

      {/* Delete document confirmation dialog */}
      <AlertDialog open={!!deleteDocFilename} onOpenChange={(open) => { if (!open) setDeleteDocFilename(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is irreversible. The file &ldquo;{deleteDocFilename}&rdquo; will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteDocument() }}
              disabled={deleteDocument.isPending}
              variant="destructive"
            >
              {deleteDocument.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete reference confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{reference.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is irreversible. The reference and all associated documents will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteReference() }}
              disabled={deleteMutation.isPending}
              variant="destructive"
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function ReferenceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError, error, refetch } = useReferenceDetail(id)

  if (isLoading) return <DetailSkeleton />

  if (isError) {
    if (error instanceof ApiError && error.statusCode === 404) {
      return <NotFound />
    }
    return (
      <ErrorAlert
        message={getErrorMessage(error)}
        onRetry={() => { refetch() }}
      />
    )
  }

  if (!data) return null

  return <ReferenceForm reference={data} />
}
