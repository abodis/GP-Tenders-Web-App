import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'

// Feature: rfp-web-v1, Property 1: API key header on every request
// Feature: rfp-web-v1, Property 2: API client error propagation
// Feature: rfp-web-v1, Property 3: Query parameter serialization

const TEST_API_BASE = 'https://api.test.example.com'
const TEST_API_KEY = 'test-api-key-12345'

describe('apiFetch property tests', () => {
  let apiFetch: typeof import('./client').apiFetch
  let ApiError: typeof import('./client').ApiError

  beforeEach(async () => {
    vi.stubEnv('VITE_API_BASE_URL', TEST_API_BASE)
    vi.stubEnv('VITE_API_KEY', TEST_API_KEY)
    vi.stubGlobal('fetch', vi.fn())

    // Dynamic import so module-level env reads pick up stubbed values
    const mod = await import('./client')
    apiFetch = mod.apiFetch
    ApiError = mod.ApiError
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  // Feature: rfp-web-v1, Property 1: API key header on every request
  // **Validates: Requirements 2.1**
  it('Property 1: always includes x-api-key header with configured value', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^\/[a-z0-9][a-z0-9/-]*$/).filter((s) => s.length >= 2 && s.length <= 50 && !s.includes('//')),
        fc.dictionary(
          fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]*$/).filter((s) => s.length >= 1 && s.length <= 20),
          fc.oneof(
            fc.stringMatching(/^[a-zA-Z0-9_-]*$/).filter((s) => s.length <= 30),
            fc.constant(undefined),
            fc.constant(null),
          ),
          { minKeys: 0, maxKeys: 5 },
        ),
        async (path, params) => {
          const mockResponse = new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
          vi.mocked(fetch).mockResolvedValueOnce(mockResponse)

          await apiFetch(path, params as Record<string, string | undefined | null>)

          expect(fetch).toHaveBeenCalledOnce()
          const [, init] = vi.mocked(fetch).mock.calls[0]
          const headers = init?.headers as Record<string, string>
          expect(headers['x-api-key']).toBe(TEST_API_KEY)

          vi.mocked(fetch).mockReset()
        },
      ),
      { numRuns: 100 },
    )
  })

  // Feature: rfp-web-v1, Property 2: API client error propagation
  // **Validates: Requirements 2.4, 2.5**
  it('Property 2: throws error with detail from JSON body or status text for non-JSON', async () => {
    const nonOkStatus = fc.integer({ min: 400, max: 599 })

    await fc.assert(
      fc.asyncProperty(
        nonOkStatus,
        fc.boolean(), // true = JSON body, false = non-JSON body
        fc.string().filter((s) => s.length >= 1 && s.length <= 100),
        async (status, isJson, detailText) => {
          const statusText = `Status${status}`

          let mockResponse: Response
          if (isJson) {
            mockResponse = new Response(JSON.stringify({ detail: detailText }), {
              status,
              statusText,
              headers: { 'Content-Type': 'application/json' },
            })
          } else {
            mockResponse = new Response('not json {{{{', {
              status,
              statusText,
            })
          }

          vi.mocked(fetch).mockResolvedValueOnce(mockResponse)

          try {
            await apiFetch('/test')
            // Should not reach here
            expect.unreachable('apiFetch should have thrown')
          } catch (err) {
            expect(err).toBeInstanceOf(ApiError)
            const apiErr = err as InstanceType<typeof ApiError>
            expect(apiErr.statusCode).toBe(status)

            if (isJson) {
              expect(apiErr.detail).toBe(detailText)
            } else {
              expect(apiErr.detail).toBe(statusText)
            }
          }

          vi.mocked(fetch).mockReset()
        },
      ),
      { numRuns: 100 },
    )
  })

  // Feature: rfp-web-v1, Property 3: Query parameter serialization
  // **Validates: Requirements 2.6**
  it('Property 3: URL contains all non-undefined/non-null params and omits undefined/null ones', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.dictionary(
          fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]*$/).filter((s) => s.length >= 1 && s.length <= 20),
          fc.oneof(
            fc.stringMatching(/^[a-zA-Z0-9_-]+$/).filter((s) => s.length >= 1 && s.length <= 30),
            fc.constant(undefined),
            fc.constant(null),
          ),
          { minKeys: 1, maxKeys: 8 },
        ),
        async (params) => {
          const mockResponse = new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
          vi.mocked(fetch).mockResolvedValueOnce(mockResponse)

          await apiFetch('/items', params as Record<string, string | undefined | null>)

          expect(fetch).toHaveBeenCalledOnce()
          const [urlStr] = vi.mocked(fetch).mock.calls[0]
          const url = new URL(urlStr as string)

          for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null) {
              expect(url.searchParams.get(key)).toBe(value)
            } else {
              expect(url.searchParams.has(key)).toBe(false)
            }
          }

          vi.mocked(fetch).mockReset()
        },
      ),
      { numRuns: 100 },
    )
  })
})
