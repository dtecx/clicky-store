/**
 * Error type thrown by the API client when the backend returns a non-2xx
 * response or when the network call itself fails. Pages and forms should
 * inspect `status` to decide how to render the failure.
 */
export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * Best-effort error message for any thrown value. Use in catch blocks to
 * surface a user-friendly string without leaking internal details.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return err.message
  }
  if (err instanceof Error) {
    return err.message
  }
  return 'Something went wrong, please try again.'
}

/**
 * True when the error is an `ApiError` with the given status. Convenient for
 * branching on 401/403/404/etc. without touching the class directly.
 */
export function isApiErrorWithStatus(err: unknown, status: number): err is ApiError {
  return err instanceof ApiError && err.status === status
}
