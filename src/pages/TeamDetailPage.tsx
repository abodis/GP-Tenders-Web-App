import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTeamDetail, useUpdateMember, useUploadCv, useDeleteMember } from '@/hooks/useTeam'
import { ApiError } from '@/api/client'
import { getTeamMemberCv } from '@/api/endpoints'
import { ErrorAlert } from '@/components/ErrorAlert'
import { getErrorMessage } from '@/utils/errors'
import { formatDateTime } from '@/utils/formatting'
import { shouldShowReExtractionWarning } from '@/utils/re-extraction-warning'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { validateCvFile } from '@/utils/cv-validation'
import type { TeamMemberResponse, TeamMemberUpdate, TeamMemberType } from '@/api/types'

function extractionStatusLabel(status: string | null): string {
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

function extractionStatusBadge(status: string | null) {
  if (!status) return null
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? ''}`}>
      {extractionStatusLabel(status)}
    </span>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
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
      <h2 className="text-xl font-semibold">Member not found</h2>
      <p className="text-sm text-muted-foreground">
        This team member doesn't exist or has been deleted.
      </p>
      <Link
        to="/team"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Back to team list
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
    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [onDismiss])

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

function MemberForm({ member }: { member: TeamMemberResponse }) {
  const [name, setName] = useState(member.name)
  const [email, setEmail] = useState(member.email)
  const [phone, setPhone] = useState(member.phone ?? '')
  const [type, setType] = useState<TeamMemberType>(member.type)
  const [roles, setRoles] = useState(member.roles.join(', '))
  const [specializations, setSpecializations] = useState(member.specializations.join(', '))
  const [languages, setLanguages] = useState(member.languages.join(', '))
  const [notes, setNotes] = useState(member.notes ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<ToastState | null>(null)

  const navigate = useNavigate()
  const updateMutation = useUpdateMember()
  const deleteMutation = useDeleteMember()
  const uploadCv = useUploadCv()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cvError, setCvError] = useState<string | null>(null)
  const [downloadingCv, setDownloadingCv] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Re-sync form when member data updates (e.g. after successful save)
  useEffect(() => {
    setName(member.name)
    setEmail(member.email)
    setPhone(member.phone ?? '')
    setType(member.type)
    setRoles(member.roles.join(', '))
    setSpecializations(member.specializations.join(', '))
    setLanguages(member.languages.join(', '))
    setNotes(member.notes ?? '')
    setErrors({})
  }, [member])

  function handleSave() {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Name is required'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    // Build partial update with only changed fields
    const body: TeamMemberUpdate = {}
    if (name !== member.name) body.name = name
    if (email !== member.email) body.email = email
    if (phone !== (member.phone ?? '')) body.phone = phone
    if (type !== member.type) body.type = type
    const rolesArray = roles.split(',').map((r) => r.trim()).filter(Boolean)
    if (JSON.stringify(rolesArray) !== JSON.stringify(member.roles)) body.roles = rolesArray
    const specsArray = specializations.split(',').map((s) => s.trim()).filter(Boolean)
    if (JSON.stringify(specsArray) !== JSON.stringify(member.specializations)) body.specializations = specsArray
    const langsArray = languages.split(',').map((l) => l.trim()).filter(Boolean)
    if (JSON.stringify(langsArray) !== JSON.stringify(member.languages)) body.languages = langsArray
    if (notes !== (member.notes ?? '')) body.notes = notes

    // Nothing changed
    if (Object.keys(body).length === 0) {
      setToast({ message: 'No changes to save', type: 'success' })
      return
    }

    updateMutation.mutate(
      { id: member.id, body },
      {
        onSuccess: () => {
          setErrors({})
          setToast({ message: 'Changes saved successfully', type: 'success' })
        },
        onError: (error) => {
          if (error instanceof ApiError && error.statusCode === 409) {
            setErrors({ email: 'Email already in use' })
          } else {
            setToast({ message: getErrorMessage(error), type: 'error' })
          }
        },
      },
    )
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset input so the same file can be re-selected
    e.target.value = ''

    const validationError = validateCvFile(file)
    if (validationError) {
      setCvError(validationError)
      return
    }

    setCvError(null)
    uploadCv.mutate(
      { id: member.id, file },
      {
        onSuccess: () => {
          setCvError(null)
        },
        onError: (error) => {
          setCvError(getErrorMessage(error))
        },
      },
    )
  }

  const existingCvFilename = member.cv_s3_key
    ? member.cv_s3_key.split('/').pop() ?? member.cv_s3_key
    : null

  async function handleDownloadCv() {
    setDownloadingCv(true)
    setCvError(null)
    try {
      const { presigned_url } = await getTeamMemberCv(member.id)
      window.open(presigned_url, '_blank')
    } catch (error) {
      setCvError(getErrorMessage(error))
    } finally {
      setDownloadingCv(false)
    }
  }

  function handleDelete() {
    setDeleteError(null)
    deleteMutation.mutate(member.id, {
      onSuccess: () => {
        navigate('/team')
      },
      onError: (error) => {
        setDeleteError(getErrorMessage(error))
      },
    })
  }

  const showReExtractionWarning = shouldShowReExtractionWarning(
    member.cv_s3_key,
    notes,
    member.notes ?? '',
  )

  return (
    <div className="space-y-6">
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{member.name}</h1>
        <Link
          to="/team"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to team
        </Link>
      </div>

      {/* Editable fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="td-name">Name</Label>
          <Input
            id="td-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="td-email">Email</Label>
          <Input
            id="td-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={254}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="td-phone">Phone</Label>
          <Input
            id="td-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={30}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="td-roles">Roles (comma-separated)</Label>
          <Input
            id="td-roles"
            value={roles}
            onChange={(e) => setRoles(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="td-type">Type</Label>
          <Select
            value={type}
            onValueChange={(v) => setType(v as TeamMemberType)}
            items={[{ value: 'employee', label: 'Employee' }, { value: 'contractor', label: 'Contractor' }]}
          >
            <SelectTrigger id="td-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="contractor">Contractor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="td-specializations">Specializations (comma-separated)</Label>
          <Input
            id="td-specializations"
            value={specializations}
            onChange={(e) => setSpecializations(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="td-languages">Languages (comma-separated)</Label>
          <Input
            id="td-languages"
            value={languages}
            onChange={(e) => setLanguages(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="td-notes">Notes</Label>
        <Textarea
          id="td-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
          rows={4}
        />
        <p className="text-xs text-muted-foreground">{notes.length}/2000</p>
        {showReExtractionWarning && (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
            Saving notes will trigger re-extraction of the CV, which may update specializations and languages.
          </div>
        )}
      </div>

      {/* Read-only fields */}
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="text-sm font-medium text-muted-foreground">Read-only fields</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Extraction status</span>
            <div>{extractionStatusBadge(member.extraction_status)}</div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Created</span>
            <p className="text-sm">{formatDateTime(member.created_at)}</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Updated</span>
            <p className="text-sm">{formatDateTime(member.updated_at)}</p>
          </div>
        </div>
      </div>

      {/* CV Upload Zone */}
      <div className="space-y-2">
        <Label>CV Upload</Label>
        <div className="rounded-lg border-2 border-dashed p-4">
          {existingCvFilename && (
            <p className="mb-2 text-sm text-muted-foreground">
              Current CV: <span className="font-medium text-foreground">{existingCvFilename}</span>
            </p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            disabled={uploadCv.isPending}
          />

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadCv.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadCv.isPending
                ? 'Uploading…'
                : existingCvFilename
                  ? 'Replace CV'
                  : 'Upload CV'}
            </Button>

            {existingCvFilename && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={downloadingCv}
                onClick={handleDownloadCv}
              >
                {downloadingCv ? 'Opening…' : 'Download CV'}
              </Button>
            )}
          </div>

          <p className="mt-1.5 text-xs text-muted-foreground">
            PDF or DOCX, max 10MB
          </p>

          {cvError && (
            <p className="mt-1.5 text-xs text-destructive">{cvError}</p>
          )}
        </div>
      </div>

      {/* Save and Delete buttons */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Saving…' : 'Save'}
        </Button>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogTrigger
            render={<Button variant="destructive" />}
            onClick={() => setDeleteError(null)}
          >
            Delete
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {member.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The team member will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteError && (
              <p className="text-sm text-destructive">{deleteError}</p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  handleDelete()
                }}
                disabled={deleteMutation.isPending}
                variant="destructive"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError, error, refetch } = useTeamDetail(id)

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

  return <MemberForm member={data} />
}
