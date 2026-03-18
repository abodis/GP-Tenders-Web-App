import { cn } from "@/lib/utils"

const statusColors: Record<string, string> = {
  success: "bg-green-100 text-green-800",
  completed: "bg-green-100 text-green-800",
  running: "bg-blue-100 text-blue-800",
  pending: "bg-blue-100 text-blue-800",
  failed: "bg-red-100 text-red-800",
  permanently_failed: "bg-red-200 text-red-900",
  skipped: "bg-gray-100 text-gray-600",
}

const defaultColor = "bg-gray-100 text-gray-600"

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        statusColors[status] ?? defaultColor
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  )
}
