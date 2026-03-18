export interface ScoreBadgeResult {
  color: 'green' | 'yellow' | 'red' | 'gray'
  label: string
}

/**
 * Returns the color variant and label for a relevance score badge.
 *
 * - green for scores 7-10
 * - yellow for scores 4-6
 * - red for scores 1-3
 * - gray with "Filtered" label for score 0
 * - gray with "N/A" label for null
 */
export function getScoreBadgeColor(score: number | null): ScoreBadgeResult {
  if (score === null) {
    return { color: 'gray', label: 'N/A' }
  }

  if (score === 0) {
    return { color: 'gray', label: 'Filtered' }
  }

  if (score >= 7) {
    return { color: 'green', label: String(score) }
  }

  if (score >= 4) {
    return { color: 'yellow', label: String(score) }
  }

  return { color: 'red', label: String(score) }
}

const eurFormatter = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

/**
 * Formats a budget value as a EUR currency string.
 * Returns "Not specified" for 0.
 */
export function formatBudget(budget: number): string {
  if (budget === 0) {
    return 'Not specified'
  }

  return eurFormatter.format(budget)
}

/**
 * Formats a numeric value as a EUR currency string.
 */
export function formatEur(value: number): string {
  return eurFormatter.format(value)
}
