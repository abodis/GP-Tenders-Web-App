import { useState } from 'react'
import { cn } from '@/lib/utils'

interface DescriptionSectionProps {
  descriptionText: string | null
}

export function DescriptionSection({ descriptionText }: DescriptionSectionProps) {
  const [expanded, setExpanded] = useState(false)

  if (!descriptionText) return null

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Description</h2>
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className={cn("text-sm whitespace-pre-wrap", !expanded && "line-clamp-6")}>
          {descriptionText}
        </p>
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-sm text-primary underline"
        >
          {expanded ? 'Show less' : 'Show full description'}
        </button>
      </div>
    </section>
  )
}
