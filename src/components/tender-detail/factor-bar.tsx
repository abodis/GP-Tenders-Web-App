import { cn } from '@/lib/utils'
import { getFactorBarColor } from '@/utils/tender-state'

interface FactorBarProps {
  label: string
  score?: number
  binary?: { excluded: boolean }
}

const colorClasses: Record<'green' | 'yellow' | 'red', string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
}

export function FactorBar({ label, score, binary }: FactorBarProps) {
  if (binary != null) {
    const excluded = binary.excluded
    return (
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex flex-1 items-center gap-2">
          <div className="relative h-2 flex-1 rounded-full bg-gray-200">
            <div
              className={cn(
                'absolute inset-0 rounded-full',
                excluded ? 'bg-red-500' : 'bg-green-500'
              )}
            />
          </div>
          <span
            className={cn(
              'text-sm font-medium',
              excluded ? 'text-red-600' : 'text-green-600'
            )}
          >
            {excluded ? 'Excluded' : 'Pass'}
          </span>
        </div>
      </div>
    )
  }

  const value = score ?? 0
  const color = getFactorBarColor(value)
  const percentage = Math.round(value * 100)

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex flex-1 items-center gap-2">
        <div className="relative h-2 flex-1 rounded-full bg-gray-200">
          <div
            className={cn('h-full rounded-full', colorClasses[color])}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm text-gray-600">{percentage}%</span>
      </div>
    </div>
  )
}
