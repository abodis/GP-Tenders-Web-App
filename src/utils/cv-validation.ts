const MAX_CV_SIZE = 10_485_760 // 10MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

/**
 * Validates a CV file for upload.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateCvFile(file: File): string | null {
  if (file.size > MAX_CV_SIZE) {
    return 'File exceeds 10MB limit'
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return 'Only PDF and DOCX files are accepted'
  }

  return null
}
