import { cn } from "@/lib/utils"
import { getScoreBadgeColor } from "@/utils/formatting"

const colorClasses: Record<string, string> = {
  green: "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-800",
  gray: "bg-gray-100 text-gray-600",
}

interface ScoreBadgeProps {
  score: number | null
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  const { color, label } = getScoreBadgeColor(score)

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        colorClasses[color]
      )}
    >
      {label}
    </span>
  )
}
