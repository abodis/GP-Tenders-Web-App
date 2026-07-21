import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReferenceList, useCreateReference } from '@/hooks/useReferences'
import { getErrorMessage } from '@/utils/errors'
import { ApiError } from '@/api/client'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorAlert } from '@/components/ErrorAlert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { ReferenceExtractionStatus } from '@/api/types'

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

function CreateReferenceDialog() {
  const navigate = useNavigate()
  const createReference = useCreateReference()

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [client, setClient] = useState('')
  const [sector, setSector] = useState('')
  const [region, setRegion] = useState('')
  const [yearValue, setYearValue] = useState('')
  const [budgetValue, setBudgetValue] = useState('')
  const [yearError, setYearError] = useState('')
  const [budgetError, setBudgetError] = useState('')
  const [generalError, setGeneralError] = useState('')

  function resetForm() {
    setTitle('')
    setClient('')
    setSector('')
    setRegion('')
    setYearValue('')
    setBudgetValue('')
    setYearError('')
    setBudgetError('')
    setGeneralError('')
    createReference.reset()
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) resetForm()
  }

  function handleYearChange(value: string) {
    setYearValue(value)
    if (value.trim() === '') {
      setYearError('')
      return
    }
    const num = Number(value)
    if (!Number.isInteger(num) || num < 1990 || num > 2030) {
      setYearError('Year must be between 1990 and 2030')
    } else {
      setYearError('')
    }
  }

  function handleBudgetChange(value: string) {
    setBudgetValue(value)
    if (value.trim() === '') {
      setBudgetError('')
      return
    }
    const num = Number(value)
    if (isNaN(num) || num < 0 || num > 999999999.99) {
      setBudgetError('Budget must be between 0 and 999,999,999.99')
    } else {
      setBudgetError('')
    }
  }

  const isValid =
    title.trim() !== '' &&
    yearError === '' &&
    budgetError === '' &&
    !createReference.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGeneralError('')

    const body: { title: string; client?: string; sector?: string; region?: string; year?: number; budget_eur?: number } = {
      title: title.trim(),
    }
    if (client.trim()) body.client = client.trim()
    if (sector.trim()) body.sector = sector.trim()
    if (region.trim()) body.region = region.trim()
    if (yearValue.trim()) body.year = Number(yearValue)
    if (budgetValue.trim()) body.budget_eur = Number(budgetValue)

    createReference.mutate(body, {
      onSuccess: (result) => {
        setOpen(false)
        navigate(`/references/${result.id}`)
      },
      onError: (error) => {
        setGeneralError(
          error instanceof ApiError
            ? error.detail
            : 'Something went wrong. Please try again.'
        )
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>Add Reference</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Reference</DialogTitle>
          <DialogDescription>
            Create a new project reference. You can add documents on the detail page.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="create-ref-title">Title</Label>
            <Input
              id="create-ref-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Project title"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="create-ref-client">Client</Label>
            <Input
              id="create-ref-client"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              maxLength={200}
              placeholder="Client name"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="create-ref-sector">Sector</Label>
            <Input
              id="create-ref-sector"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              maxLength={100}
              placeholder="e.g. Environment"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="create-ref-region">Region</Label>
            <Input
              id="create-ref-region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              maxLength={100}
              placeholder="e.g. Eastern Europe"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="create-ref-year">Year</Label>
            <Input
              id="create-ref-year"
              type="number"
              value={yearValue}
              onChange={(e) => handleYearChange(e.target.value)}
              placeholder="e.g. 2023"
            />
            {yearError && (
              <p className="text-xs text-destructive">{yearError}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="create-ref-budget">Budget (EUR)</Label>
            <Input
              id="create-ref-budget"
              type="number"
              step="0.01"
              value={budgetValue}
              onChange={(e) => handleBudgetChange(e.target.value)}
              placeholder="e.g. 500000"
            />
            {budgetError && (
              <p className="text-xs text-destructive">{budgetError}</p>
            )}
          </div>

          {generalError && (
            <p className="text-xs text-destructive">{generalError}</p>
          )}

          <DialogFooter>
            <Button
              type="submit"
              disabled={!isValid}
            >
              {createReference.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function ReferenceListPage() {
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sectorInput, setSectorInput] = useState('')
  const [yearInput, setYearInput] = useState('')

  // 300ms debounce for search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const search = debouncedSearch || undefined
  const sector = sectorInput || undefined
  const year = yearInput || undefined

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useReferenceList(search, sector, year)

  const references = data?.pages.flatMap((page) => page.items) ?? []
  const hasFiltersActive = debouncedSearch !== '' || sectorInput !== '' || yearInput !== ''

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
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">References</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your portfolio of past project references.
          </p>
        </div>
        <CreateReferenceDialog />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Search</span>
          <Input
            placeholder="Search by title or client..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="min-w-[220px]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Sector</span>
          <Input
            placeholder="Filter by sector..."
            value={sectorInput}
            onChange={(e) => setSectorInput(e.target.value)}
            className="min-w-[160px]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Year</span>
          <Input
            placeholder="e.g. 2023"
            value={yearInput}
            onChange={(e) => setYearInput(e.target.value)}
            className="min-w-[100px]"
          />
        </div>
      </div>

      {/* Table */}
      {references.length === 0 ? (
        <div className="rounded-lg border px-4 py-8 text-center text-muted-foreground">
          {hasFiltersActive
            ? 'No references match the current filters'
            : 'No references yet'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Client</th>
                <th className="px-4 py-3 text-left font-medium">Sector</th>
                <th className="px-4 py-3 text-left font-medium">Year</th>
                <th className="px-4 py-3 text-left font-medium">Budget</th>
                <th className="px-4 py-3 text-left font-medium">Extraction</th>
              </tr>
            </thead>
            <tbody>
              {references.map((reference) => (
                <tr
                  key={reference.id}
                  onClick={() => navigate(`/references/${reference.id}`)}
                  className="cursor-pointer border-b transition-colors even:bg-muted/30 hover:bg-muted/50"
                >
                  <td className="px-4 py-3 whitespace-nowrap">{reference.title}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{reference.client || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{reference.sector || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{reference.year ?? '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {reference.budget_eur !== null
                      ? `€${reference.budget_eur.toLocaleString()}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {reference.extraction_status ? (
                      <Badge
                        variant="outline"
                        className={getExtractionBadgeClasses(reference.extraction_status)}
                      >
                        {getExtractionStatusLabel(reference.extraction_status)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Load more */}
      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  )
}
