import { ApiError } from '../utils/errors'
import type { ApiErrorBody } from '../types/api'

/**
 * Base URL for API calls. Configure via `VITE_API_BASE_URL` in `.env` files
 * if the backend ever moves; defaults to the same-origin `/api/v1` mount.
 */
const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/+$/, '')

/**
 * Single authoritative bearer token for all API calls. Auth code is the only
 * caller that should mutate it; everything else just reads it via fetch.
 */
let authToken: string | null = null

export function setAuthToken(token: string | null): void {
  authToken = token
}

export function getAuthToken(): string | null {
  return authToken
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT'
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | null>
  signal?: AbortSignal
  /**
   * Skip attaching the bearer token even when one is set. Useful for the
   * register/login endpoints, although attaching is harmless.
   */
  anonymous?: boolean
  /**
   * Override `Accept` / supply additional headers. Content-Type is set
   * automatically when a JSON body is provided.
   */
  headers?: Record<string, string>
}

export function buildApiUrl(path: string, query?: RequestOptions['query']): string {
  const trimmedPath = path.startsWith('/') ? path : `/${path}`
  const url = `${baseUrl}${trimmedPath}`
  if (!query) {
    return url
  }
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue
    }
    params.append(key, String(value))
  }
  const search = params.toString()
  return search ? `${url}?${search}` : url
}

function authHeaders(anonymous?: boolean): Record<string, string> {
  if (!anonymous && authToken) {
    return { Authorization: `Bearer ${authToken}` }
  }

  return {}
}

/**
 * Core fetch wrapper. Returns the parsed JSON body on success and throws an
 * `ApiError` with the backend's error message on failure. Generic over the
 * expected response type; pass `void` for endpoints that return 204.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal, anonymous, headers = {} } = options

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  }

  let payload: BodyInit | undefined
  if (body !== undefined) {
    finalHeaders['Content-Type'] = finalHeaders['Content-Type'] ?? 'application/json'
    payload = JSON.stringify(body)
  }

  Object.assign(finalHeaders, authHeaders(anonymous))

  let response: Response
  try {
    response = await fetch(buildApiUrl(path, query), {
      method,
      headers: finalHeaders,
      body: payload,
      signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err
    }
    throw new ApiError('Network error, please check your connection.', 0)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  let parsed: unknown = undefined
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text)
    } catch {
      // Fall through; non-JSON responses become generic errors.
    }
  }

  if (!response.ok) {
    const message =
      parsed && typeof parsed === 'object' && 'error' in parsed
        ? String((parsed as ApiErrorBody).error)
        : `Request failed with status ${response.status}`
    throw new ApiError(message, response.status)
  }

  return parsed as T
}

export async function apiFetchForm<T>(
  path: string,
  formData: FormData,
  options: Pick<RequestOptions, 'method' | 'query' | 'signal' | 'anonymous' | 'headers'> = {},
): Promise<T> {
  const {
    method = 'POST',
    query,
    signal,
    anonymous,
    headers = {},
  } = options

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
    ...authHeaders(anonymous),
  }

  let response: Response
  try {
    response = await fetch(buildApiUrl(path, query), {
      method,
      headers: finalHeaders,
      body: formData,
      signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err
    }
    throw new ApiError('Network error, please check your connection.', 0)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  let parsed: unknown = undefined
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text)
    } catch {
      // Fall through; non-JSON responses become generic errors.
    }
  }

  if (!response.ok) {
    const message =
      parsed && typeof parsed === 'object' && 'error' in parsed
        ? String((parsed as ApiErrorBody).error)
        : `Request failed with status ${response.status}`
    throw new ApiError(message, response.status)
  }

  return parsed as T
}
