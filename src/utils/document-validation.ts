const MAX_DOCUMENT_SIZE = 10_485_760 // 10MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

/**
 * Validates a document file for upload.
 * Returns null if valid, or an error message string if invalid.
 * Size is checked first per requirement 3.4.
 */
export function validateDocument(file: File): string | null {
  if (file.size > MAX_DOCUMENT_SIZE) {
    return 'File exceeds 10MB limit'
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return 'Only PDF and DOCX files are accepted'
  }

  return null
}
