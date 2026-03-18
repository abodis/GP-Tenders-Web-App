import { cn } from "@/lib/utils"
import { getScoreBadgeColor } from "@/utils/formatting"

const colorClasses: Record<string, string> = {
  green: "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-800",
  gray: "bg-gray-100 text-gray-600",
}

interface RelevanceScoreVisualProps {
  score: number | null
}

export function RelevanceScoreVisual({ score }: RelevanceScoreVisualProps) {
  const { color, label } = getScoreBadgeColor(score)

  return (
    <div
      className={cn(
        "inline-flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold",
        colorClasses[color]
      )}
    >
      {label}
    </div>
  )
}
