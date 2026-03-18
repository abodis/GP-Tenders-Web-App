import { describe, it, expect } from 'vitest'
import { ApiError } from '@/api/client'
import { getErrorMessage } from '@/utils/errors'

describe('getErrorMessage', () => {
  it('returns "API key is invalid or missing" for ApiError with status 403', () => {
    const err = new ApiError('Forbidden', 403)
    expect(getErrorMessage(err)).toBe('API key is invalid or missing')
  })

  it('returns "Server error, please retry" for ApiError with status 500', () => {
    const err = new ApiError('Internal Server Error', 500)
    expect(getErrorMessage(err)).toBe('Server error, please retry')
  })

  it('returns the detail message for ApiError with other status codes', () => {
    const err = new ApiError('Not Found', 404)
    expect(getErrorMessage(err)).toBe('Not Found')
  })

  it('returns "API is unreachable" for TypeError with "fetch" in message', () => {
    const err = new TypeError('Failed to fetch')
    expect(getErrorMessage(err)).toBe('API is unreachable')
  })

  it('returns "API is unreachable" for TypeError with "network" in message', () => {
    const err = new TypeError('NetworkError when attempting to fetch resource')
    expect(getErrorMessage(err)).toBe('API is unreachable')
  })

  it('returns the message for a generic Error', () => {
    const err = new Error('Something went wrong')
    expect(getErrorMessage(err)).toBe('Something went wrong')
  })

  it('returns "An unexpected error occurred" for non-Error values', () => {
    expect(getErrorMessage('string error')).toBe('An unexpected error occurred')
    expect(getErrorMessage(42)).toBe('An unexpected error occurred')
    expect(getErrorMessage(null)).toBe('An unexpected error occurred')
    expect(getErrorMessage(undefined)).toBe('An unexpected error occurred')
  })
})
