/**
 * Converts a snake_case tender type string to Title Case.
 * Returns null for null input.
 */
export function humanizeTenderType(tenderType: string | null): string | null {
  if (tenderType == null) return null
  return tenderType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
