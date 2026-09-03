import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { TenderDetailResponse } from '@/api/types'
import { useTenderActions } from '@/hooks/useTenderActions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface TeamRequirementsSectionProps {
  tender: TenderDetailResponse
  sourceId: string
  tenderId: string
}

const confidenceColors: Record<string, string> = {
  high: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  low: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export function TeamRequirementsSection({ tender, sourceId, tenderId }: TeamRequirementsSectionProps) {
  const { extractTeam } = useTenderActions(sourceId, tenderId)
  const [error, setError] = useState<string | null>(null)

  const teamReqs = tender.team_requirements

  // Null + status not completed → show nothing
  if (teamReqs === null && tender.status !== 'completed') return null

  // Null + status completed → show extract button
  if (teamReqs === null) {
    return (
      <section>
        <h2 className="mb-3 text-lg font-semibold">Team Requirements</h2>
        <div className="space-y-2">
          <Button
            variant="outline"
            disabled={extractTeam.isPending}
            onClick={() => {
              setError(null)
              extractTeam.mutate(undefined, {
                onError: (err) => {
                  setError(err instanceof Error ? err.message : 'Extraction failed')
                },
              })
            }}
          >
            {extractTeam.isPending && <Loader2 className="size-4 animate-spin" />}
            Extract Team Requirements
          </Button>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
      </section>
    )
  }

  // Exists but empty array
  if (teamReqs.team_requirements.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-lg font-semibold">Team Requirements</h2>
        <div className="flex items-center gap-2 mb-3">
          <Badge className={confidenceColors[teamReqs.extraction_confidence]}>
            {teamReqs.extraction_confidence}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Experts required: {teamReqs.total_experts_required ?? 'Unknown'}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">No specific team roles were extracted from this tender.</p>
      </section>
    )
  }

  // Has items → render table
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Team Requirements</h2>
      <div className="flex items-center gap-2 mb-3">
        <Badge className={confidenceColors[teamReqs.extraction_confidence]}>
          {teamReqs.extraction_confidence}
        </Badge>
        <span className="text-sm text-muted-foreground">
          Experts required: {teamReqs.total_experts_required ?? 'Unknown'}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Role</th>
              <th className="pb-2 pr-4 font-medium">Mandatory</th>
              <th className="pb-2 pr-4 font-medium">Min Years</th>
              <th className="pb-2 pr-4 font-medium">Specializations</th>
              <th className="pb-2 font-medium">Languages</th>
            </tr>
          </thead>
          <tbody>
            {teamReqs.team_requirements.map((req, idx) => (
              <tr key={idx} className="border-b last:border-0">
                <td className="py-2 pr-4">{req.role}</td>
                <td className="py-2 pr-4">{req.mandatory ? 'Yes' : 'No'}</td>
                <td className="py-2 pr-4">{req.min_years ?? '—'}</td>
                <td className="py-2 pr-4">
                  {req.specializations.length > 0 ? req.specializations.join(', ') : '—'}
                </td>
                <td className="py-2">
                  {req.languages.length > 0 ? req.languages.join(', ') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
