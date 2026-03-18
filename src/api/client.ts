const API_BASE = import.meta.env.VITE_API_BASE_URL as string
const API_KEY = import.meta.env.VITE_API_KEY as string

export class ApiError extends Error {
  detail: string
  statusCode: number

  constructor(detail: string, statusCode: number) {
    super(detail)
    this.detail = detail
    this.statusCode = statusCode
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(
  path: string,
  params?: Record<string, string | undefined | null>,
): Promise<T> {
  const url = new URL(path, API_BASE)

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value)
      }
    }
  }

  const res = await fetch(url.toString(), {
    headers: { 'x-api-key': API_KEY },
  })

  if (!res.ok) {
    let detail: string
    try {
      const body = await res.json()
      detail = body.detail ?? res.statusText
    } catch {
      detail = res.statusText
    }
    throw new ApiError(detail, res.status)
  }

  return res.json() as Promise<T>
}
