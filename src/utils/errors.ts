import { ApiError } from '@/api/client'

/**
 * Returns a human-readable error message based on the error type.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.statusCode === 403) return 'API key is invalid or missing'
    if (error.statusCode === 500) return 'Server error, please retry'
    return error.detail
  }

  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase()
    if (msg.includes('fetch') || msg.includes('network')) {
      return 'API is unreachable'
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred'
}
