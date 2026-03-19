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

/**
 * Extracts the short model name from a potentially slash-separated path.
 * e.g. "accounts/fireworks/models/llama-v3p3-70b-instruct" → "llama-v3p3-70b-instruct"
 */
export function formatModelName(model: string): string {
  const lastSlash = model.lastIndexOf('/')
  return lastSlash === -1 ? model : model.slice(lastSlash + 1)
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Formats an ISO timestamp into a concise human-readable string.
 * e.g. "2025-01-15T14:30:00Z" → "15 Jan 2025, 14:30"
 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (isNaN(date.getTime())) return iso
  return dateTimeFormatter.format(date)
}
