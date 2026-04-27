import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  hasNextPage: boolean
  hasPreviousPage: boolean
  /** First item index on current page (1-based) */
  from: number
  /** Last item index on current page (1-based) */
  to: number
  /** Total number of items across all pages */
  total: number | null
}

/**
 * Compute which page buttons to show, inserting ellipsis markers for gaps.
 * Always shows first page, last page, and a window around the current page.
 */
function getPageRange(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages: (number | 'ellipsis')[] = []
  const windowStart = Math.max(2, currentPage - 1)
  const windowEnd = Math.min(totalPages - 1, currentPage + 1)

  pages.push(1)

  if (windowStart > 2) {
    pages.push('ellipsis')
  }

  for (let i = windowStart; i <= windowEnd; i++) {
    pages.push(i)
  }

  if (windowEnd < totalPages - 1) {
    pages.push('ellipsis')
  }

  if (totalPages > 1) {
    pages.push(totalPages)
  }

  return pages
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  hasNextPage,
  hasPreviousPage,
  from,
  to,
  total,
}: PaginationProps) {
  const pages = getPageRange(currentPage, totalPages)

  return (
    <nav aria-label="Pagination" className="flex flex-col items-center gap-3 py-4">
      {total !== null && (
        <p className="text-sm text-muted-foreground">
          Showing {from}–{to} of {total} tenders
        </p>
      )}

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </Button>

        {pages.map((page, idx) =>
          page === 'ellipsis' ? (
            <span
              key={`ellipsis-${idx}`}
              className="flex size-7 items-center justify-center text-muted-foreground"
              aria-hidden="true"
            >
              <MoreHorizontal className="size-4" />
            </span>
          ) : (
            <Button
              key={page}
              variant={page === currentPage ? 'default' : 'outline'}
              size="icon-sm"
              onClick={() => onPageChange(page)}
              disabled={page === currentPage}
              aria-current={page === currentPage ? 'page' : undefined}
              aria-label={`Page ${page}`}
            >
              {page}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
          aria-label="Next page"
        >
          <ChevronRight />
        </Button>
      </div>
    </nav>
  )
}
