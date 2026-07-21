import { useMemo } from 'react'
import { marked } from 'marked'
import { cn } from '@/lib/utils'

interface MarkdownPreviewProps {
  content: string
  className?: string
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  const html = useMemo(() => {
    try {
      return marked.parse(content, { async: false }) as string
    } catch {
      return content
    }
  }, [content])

  return (
    <div
      className={cn('prose prose-sm max-w-none dark:prose-invert', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
