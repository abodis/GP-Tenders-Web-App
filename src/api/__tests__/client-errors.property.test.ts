import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'

// Feature: team-management, Property 1: API client error handling consistency
// **Validates: Requirements 1.4**

const TEST_API_BASE = 'https://api.test.example.com'
const TEST_API_KEY = 'test-api-key-12345'

describe('API client error handling consistency', () => {
  let apiPost: typeof import('../client').apiPost
  let apiDelete: typeof import('../client').apiDelete
  let apiUpload: typeof import('../client').apiUpload
  let ApiError: typeof import('../client').ApiError

  beforeEach(async () => {
    vi.stubEnv('VITE_API_BASE_URL', TEST_API_BASE)
    vi.stubEnv('VITE_API_KEY', TEST_API_KEY)
    vi.stubGlobal('fetch', vi.fn())

    const mod = await import('../client')
    apiPost = mod.apiPost
    apiDelete = mod.apiDelete
    apiUpload = mod.apiUpload
    ApiError = mod.ApiError
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  // Feature: team-management, Property 1: API client error handling consistency
  it('Property 1: apiPost, apiDelete, apiUpload throw ApiError with correct statusCode and detail for any non-2xx response', async () => {
    const statusCodeArb = fc.integer({ min: 400, max: 599 })

    const bodyWithDetailArb = fc.record({
      detail: fc.string({ minLength: 1, maxLength: 100 }),
    })

    const bodyWithoutDetailArb = fc.record({
      other: fc.string({ minLength: 0, maxLength: 100 }),
    })

    const nonJsonBodyArb = fc.string({ minLength: 1, maxLength: 100 }).filter(
      (s) => {
        try {
          JSON.parse(s)
          return false
        } catch {
          return true
        }
      },
    )

    type BodyType = 'json-with-detail' | 'json-without-detail' | 'non-json'

    const bodyTypeArb = fc.oneof(
      fc.constant('json-with-detail' as BodyType),
      fc.constant('json-without-detail' as BodyType),
      fc.constant('non-json' as BodyType),
    )

    await fc.assert(
      fc.asyncProperty(
        statusCodeArb,
        bodyTypeArb,
        bodyWithDetailArb,
        bodyWithoutDetailArb,
        nonJsonBodyArb,
        async (statusCode, bodyType, jsonWithDetail, jsonWithoutDetail, nonJsonBody) => {
          const statusText = `StatusText${statusCode}`

          const callers: Array<{ name: string; call: () => Promise<unknown> }> = [
            { name: 'apiPost', call: () => apiPost('/test', { foo: 'bar' }) },
            { name: 'apiDelete', call: () => apiDelete('/test') },
            { name: 'apiUpload', call: () => apiUpload('/test', new FormData()) },
          ]

          for (const { call } of callers) {
            let responseBody: string
            let contentType: string

            if (bodyType === 'json-with-detail') {
              responseBody = JSON.stringify(jsonWithDetail)
              contentType = 'application/json'
            } else if (bodyType === 'json-without-detail') {
              responseBody = JSON.stringify(jsonWithoutDetail)
              contentType = 'application/json'
            } else {
              responseBody = nonJsonBody
              contentType = 'text/plain'
            }

            const mockResponse = new Response(responseBody, {
              status: statusCode,
              statusText,
              headers: { 'Content-Type': contentType },
            })

            vi.mocked(fetch).mockResolvedValueOnce(mockResponse)

            try {
              await call()
              expect.unreachable('Should have thrown ApiError')
            } catch (err) {
              expect(err).toBeInstanceOf(ApiError)
              const apiErr = err as InstanceType<typeof ApiError>
              expect(apiErr.statusCode).toBe(statusCode)

              if (bodyType === 'json-with-detail') {
                expect(apiErr.detail).toBe(jsonWithDetail.detail)
              } else if (bodyType === 'json-without-detail') {
                expect(apiErr.detail).toBe(statusText)
              } else {
                expect(apiErr.detail).toBe(statusText)
              }
            }

            vi.mocked(fetch).mockReset()
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
