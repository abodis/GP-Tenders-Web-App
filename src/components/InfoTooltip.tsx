import { Tooltip } from '@base-ui/react/tooltip'
import { Info } from 'lucide-react'

interface InfoTooltipProps {
  children: React.ReactNode
}

export function InfoTooltip({ children }: InfoTooltipProps) {
  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger className="inline-flex items-center text-muted-foreground hover:text-foreground">
          <Info className="h-4 w-4" />
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner sideOffset={4}>
            <Tooltip.Popup className="z-50 max-w-xs rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
              {children}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
