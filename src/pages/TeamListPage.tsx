import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTeamList, useCreateMember } from '@/hooks/useTeam'
import { getErrorMessage } from '@/utils/errors'
import { ApiError } from '@/api/client'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorAlert } from '@/components/ErrorAlert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { TeamMemberType, ExtractionStatus } from '@/api/types'

const TYPE_OPTIONS = [
  { value: '__all__', label: 'All types' },
  { value: 'employee', label: 'Employee' },
  { value: 'contractor', label: 'Contractor' },
]

function getExtractionBadgeClasses(status: ExtractionStatus | null): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    case 'failed':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    default:
      return ''
  }
}

function getExtractionStatusLabel(status: ExtractionStatus | null): string {
  switch (status) {
    case 'pending':
      return 'No CV Uploaded'
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
    default:
      return ''
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const MEMBER_TYPE_OPTIONS = [
  { value: 'employee', label: 'Employee' },
  { value: 'contractor', label: 'Contractor' },
]

function CreateMemberDialog() {
  const navigate = useNavigate()
  const createMember = useCreateMember()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [type, setType] = useState('')
  const [roles, setRoles] = useState('')
  const [emailError, setEmailError] = useState('')
  const [generalError, setGeneralError] = useState('')

  function resetForm() {
    setName('')
    setEmail('')
    setType('')
    setRoles('')
    setEmailError('')
    setGeneralError('')
    createMember.reset()
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) resetForm()
  }

  const isValid =
    name.trim() !== '' &&
    EMAIL_REGEX.test(email) &&
    type !== ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEmailError('')
    setGeneralError('')

    const rolesArray = roles
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean)

    createMember.mutate(
      {
        name: name.trim(),
        email: email.trim(),
        type: type as TeamMemberType,
        roles: rolesArray.length > 0 ? rolesArray : undefined,
      },
      {
        onSuccess: (result) => {
          setOpen(false)
          navigate(`/team/${result.id}`)
        },
        onError: (error) => {
          if (error instanceof ApiError && error.statusCode === 422) {
            setEmailError(error.detail || 'This email is already in use')
          } else {
            setGeneralError(
              error instanceof ApiError
                ? error.detail
                : 'Something went wrong. Please try again.'
            )
          }
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>Add Member</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Create a new team member. You can add more details on their profile page.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="create-name">Name</Label>
            <Input
              id="create-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="Full name"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="create-email">Email</Label>
            <Input
              id="create-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setEmailError('')
              }}
              maxLength={254}
              placeholder="email@example.com"
              required
            />
            {emailError && (
              <p className="text-xs text-destructive">{emailError}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="create-type">Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v ?? '')}
              items={MEMBER_TYPE_OPTIONS}
            >
              <SelectTrigger id="create-type" className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {MEMBER_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="create-roles">Roles</Label>
            <Input
              id="create-roles"
              value={roles}
              onChange={(e) => setRoles(e.target.value)}
              maxLength={500}
              placeholder="Comma-separated roles"
            />
          </div>

          {generalError && (
            <p className="text-xs text-destructive">{generalError}</p>
          )}

          <DialogFooter>
            <Button
              type="submit"
              disabled={!isValid || createMember.isPending}
            >
              {createMember.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function TeamListPage() {
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('__all__')

  // 300ms debounce for search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const type = typeFilter === '__all__' ? undefined : (typeFilter as TeamMemberType)
  const search = debouncedSearch || undefined

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTeamList(type, search)

  const members = data?.pages.flatMap((page) => page.items) ?? []
  const hasFiltersActive = debouncedSearch !== '' || typeFilter !== '__all__'

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
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your team roster — employees and contractors.
          </p>
        </div>
        <CreateMemberDialog />
      </div>

      {/* Search and filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Search</span>
          <Input
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="min-w-[220px]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Type</span>
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v ?? '__all__')}
            items={TYPE_OPTIONS}
          >
            <SelectTrigger className="min-w-[140px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {members.length === 0 ? (
        <div className="rounded-lg border px-4 py-8 text-center text-muted-foreground">
          {hasFiltersActive
            ? 'No members match the current criteria'
            : 'No team members yet'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Roles</th>
                <th className="px-4 py-3 text-left font-medium">Extraction</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr
                  key={member.id}
                  onClick={() => navigate(`/team/${member.id}`)}
                  className="cursor-pointer border-b transition-colors even:bg-muted/30 hover:bg-muted/50"
                >
                  <td className="px-4 py-3 whitespace-nowrap">{member.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{member.email || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap capitalize">{member.type}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {member.roles.length > 0
                        ? member.roles.map((role) => (
                          <Badge key={role} variant="secondary" className="text-xs">
                            {role}
                          </Badge>
                        ))
                        : <span className="text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {member.extraction_status ? (
                      <Badge
                        variant="outline"
                        className={getExtractionBadgeClasses(member.extraction_status)}
                      >
                        {getExtractionStatusLabel(member.extraction_status)}
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
