const FIFTY_MINUTES_MS = 50 * 60 * 1000

/**
 * Returns true when the elapsed time between `fetchTimestamp` and `now`
 * exceeds 50 minutes, indicating a presigned URL has likely expired.
 *
 * Both parameters are timestamps in milliseconds (like `Date.now()`).
 */
export function isPresignedUrlExpired(fetchTimestamp: number, now: number): boolean {
  return now - fetchTimestamp > FIFTY_MINUTES_MS
}
