/**
 * Format a price in minor units (cents) into a localized currency string.
 *
 * The backend stores prices as integer cents to avoid floating point drift,
 * so the frontend converts to the major unit only at render time.
 */
export function formatCents(cents: number, currency: string): string {
  const code = (currency || 'USD').toUpperCase()
  const amount = Number.isFinite(cents) ? cents / 100 : 0

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'symbol',
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${code}`
  }
}
