import type { ExclusionResult } from '@/api/types'

interface ExclusionBannerProps {
  exclusionResult: ExclusionResult | null
}

export function ExclusionBanner({ exclusionResult }: ExclusionBannerProps) {
  if (!exclusionResult || !exclusionResult.excluded) return null

  return (
    <div className="rounded-lg border border-red-400/50 bg-red-50 p-4">
      <h3 className="mb-1 text-sm font-semibold text-red-800">Excluded</h3>
      <ul className="list-inside list-disc space-y-1 text-sm text-red-700">
        {exclusionResult.exclusion_reasons.map((reason, i) => (
          <li key={i}>{reason}</li>
        ))}
      </ul>
    </div>
  )
}
