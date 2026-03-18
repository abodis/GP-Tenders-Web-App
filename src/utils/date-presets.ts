/**
 * Pure date utility functions for date range presets.
 * All functions return ISO date strings (YYYY-MM-DD).
 * Week starts on Monday (ISO standard).
 */

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Today's date as YYYY-MM-DD. */
export function today(): string {
  return formatDate(new Date())
}

/** Date N days ago as YYYY-MM-DD. */
export function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return formatDate(d)
}

/** Monday of the current week as YYYY-MM-DD. */
export function startOfWeek(): string {
  const d = new Date()
  const day = d.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? 6 : day - 1 // days since Monday
  d.setDate(d.getDate() - diff)
  return formatDate(d)
}

/** Sunday of the current week as YYYY-MM-DD. */
export function endOfWeek(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 0 : 7 - day // days until Sunday
  d.setDate(d.getDate() + diff)
  return formatDate(d)
}

/** First day of the current month as YYYY-MM-DD. */
export function startOfMonth(): string {
  const d = new Date()
  d.setDate(1)
  return formatDate(d)
}

/** Last day of the current month as YYYY-MM-DD. */
export function endOfMonth(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1, 0)
  return formatDate(d)
}

/** First day of last month as YYYY-MM-DD. */
export function startOfLastMonth(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 1, 1)
  return formatDate(d)
}

/** Last day of last month as YYYY-MM-DD. */
export function endOfLastMonth(): string {
  const d = new Date()
  d.setDate(0) // day 0 of current month = last day of previous month
  return formatDate(d)
}

export interface DateRange {
  from: string
  to: string
}

export interface DatePreset {
  readonly label: string
  readonly getRange: () => DateRange
}

export const DATE_PRESETS: readonly DatePreset[] = [
  { label: 'Today', getRange: () => { const d = today(); return { from: d, to: d } } },
  { label: 'Last 7 days', getRange: () => ({ from: daysAgo(7), to: today() }) },
  { label: 'Last 30 days', getRange: () => ({ from: daysAgo(30), to: today() }) },
  { label: 'This week', getRange: () => ({ from: startOfWeek(), to: endOfWeek() }) },
  { label: 'This month', getRange: () => ({ from: startOfMonth(), to: endOfMonth() }) },
  { label: 'Last month', getRange: () => ({ from: startOfLastMonth(), to: endOfLastMonth() }) },
] as const
