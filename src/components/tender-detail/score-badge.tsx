import { cn } from '@/lib/utils'
import { getScoreBadgeColor } from '@/utils/tender-state'

interface ScoreBadgeProps {
  score: number | null
}

const colorClasses: Record<ReturnType<typeof getScoreBadgeColor>, string> = {
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-100 text-gray-600',
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  const color = getScoreBadgeColor(score)
  const label = score == null ? '—' : score === 0 ? 'Filtered' : score.toFixed(1)

  return (
    <span
      className={cn(
        'inline-flex size-12 items-center justify-center rounded-full text-lg font-bold tabular-nums',
        colorClasses[color],
      )}
    >
      {label}
    </span>
  )
}
