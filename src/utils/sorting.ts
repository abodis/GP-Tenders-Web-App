import type { RunItem, TenderListItem } from '@/api/types'

/**
 * Sorts runs by `started_at` descending (newest first).
 * Returns a new array — does not mutate the input.
 */
export function sortRunsByDate(runs: RunItem[]): RunItem[] {
  return [...runs].sort((a, b) => (a.started_at > b.started_at ? -1 : a.started_at < b.started_at ? 1 : 0))
}

/**
 * Sorts tenders client-side by the given field and direction.
 * Null values are always sorted last regardless of direction.
 * Returns a new array — does not mutate the input.
 */
export function sortTendersClientSide(
  tenders: TenderListItem[],
  field: 'budget' | 'deadline',
  direction: 'asc' | 'desc',
): TenderListItem[] {
  return [...tenders].sort((a, b) => {
    const aVal = a[field]
    const bVal = b[field]

    // Null values sort last regardless of direction
    if (aVal === null && bVal === null) return 0
    if (aVal === null) return 1
    if (bVal === null) return -1

    let cmp: number
    if (field === 'budget') {
      cmp = (aVal as number) - (bVal as number)
    } else {
      // deadline is a string (ISO date) — lexicographic comparison works
      cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    }

    return direction === 'asc' ? cmp : -cmp
  })
}
