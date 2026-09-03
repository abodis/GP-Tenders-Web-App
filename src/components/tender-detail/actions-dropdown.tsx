import { useState } from 'react'
import { ChevronDown, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { useTenderActions } from '@/hooks/useTenderActions'

interface ActionsDropdownProps {
  sourceId: string
  tenderId: string
}

interface ActionItem {
  key: 'extractTeam' | 'teamMatch' | 'extractReferences' | 'referenceMatch' | 'exclusionCheck'
  label: string
}

const ACTION_ITEMS: ActionItem[] = [
  { key: 'extractTeam', label: 'Extract Team Requirements' },
  { key: 'teamMatch', label: 'Run Team Match' },
  { key: 'extractReferences', label: 'Extract Reference Requirements' },
  { key: 'referenceMatch', label: 'Run Reference Match' },
  { key: 'exclusionCheck', label: 'Check Exclusion Criteria' },
]

export function ActionsDropdown({ sourceId, tenderId }: ActionsDropdownProps) {
  const actions = useTenderActions(sourceId, tenderId)
  const [dismissedErrors, setDismissedErrors] = useState<Set<string>>(new Set())

  const visibleErrors = ACTION_ITEMS.filter(
    (item) => actions[item.key].error && !dismissedErrors.has(item.key)
  )

  function dismissError(key: string) {
    setDismissedErrors((prev) => {
      const next = new Set(prev)
      next.add(key)
      return next
    })
    actions[key as ActionItem['key']].reset()
  }

  function handleAction(item: ActionItem) {
    // Clear any previously dismissed error for this action
    setDismissedErrors((prev) => {
      const next = new Set(prev)
      next.delete(item.key)
      return next
    })
    actions[item.key].mutate()
  }

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm">
              Actions
              <ChevronDown className="size-3.5" data-icon="inline-end" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          {ACTION_ITEMS.map((item) => {
            const mutation = actions[item.key]
            return (
              <DropdownMenuItem
                key={item.key}
                disabled={mutation.isPending}
                onClick={() => handleAction(item)}
                className="gap-2"
              >
                {mutation.isPending && (
                  <Loader2 className="size-3.5 animate-spin" />
                )}
                {item.label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {visibleErrors.length > 0 && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-48">
          {visibleErrors.map((item) => (
            <div
              key={item.key}
              className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-xs text-destructive"
            >
              <span className="flex-1">{item.label} failed</span>
              <button
                type="button"
                onClick={() => dismissError(item.key)}
                className="shrink-0 rounded p-0.5 hover:bg-destructive/10"
                aria-label={`Dismiss ${item.label} error`}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
