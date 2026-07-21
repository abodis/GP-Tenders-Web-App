/**
 * Determines whether the re-extraction warning banner should be visible.
 *
 * The warning is shown when a CV exists AND the current notes differ from the saved value,
 * indicating that saving will trigger re-extraction of the CV.
 */
export function shouldShowReExtractionWarning(
  cvS3Key: string | null,
  currentNotes: string,
  savedNotes: string,
): boolean {
  return cvS3Key !== null && currentNotes !== savedNotes
}
