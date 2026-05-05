/**
 * Shape of error responses produced by the Go backend.
 * The handler always returns `{ "error": "message" }` for non-2xx responses.
 */
export type ApiErrorBody = {
  error: string
}

/**
 * Order status values produced by the backend.
 * Mirrors `domains.OrderStatus*` constants in `internal/core/domains/models.go`.
 */
export type OrderStatus = 'pending' | 'confirmed' | 'payment_failed'

/**
 * Payment status values produced by the backend.
 * Mirrors `domains.PaymentStatus*` constants in `internal/core/domains/models.go`.
 */
export type PaymentStatus = 'pending' | 'paid' | 'failed'

/**
 * Result options accepted by `POST /api/v1/orders/{id}/payment/simulate`.
 */
export type PaymentSimulationResult = 'success' | 'failure'

/**
 * Roles supported by the backend.
 */
export type UserRole = 'customer' | 'admin'
