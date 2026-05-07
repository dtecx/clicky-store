import { CreditCard } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createOrder } from '../api/orders'
import { CheckoutSummary } from '../components/checkout/CheckoutSummary'
import { PageShell } from '../components/layout/PageShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LinkButton } from '../components/ui/LinkButton'
import { LoadingState } from '../components/ui/LoadingState'
import { useCart } from '../state/useCart'
import { errorMessage } from '../utils/errors'

export function CheckoutPage() {
  const navigate = useNavigate()
  const { cart, error, status, refresh } = useCart()
  const [paymentMethod, setPaymentMethod] = useState('simulation')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) {
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      const order = await createOrder(paymentMethod)
      await refresh().catch(() => null)
      navigate(`/orders?highlight=${encodeURIComponent(order.id)}`, { replace: true })
    } catch (err) {
      setSubmitError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading' && !cart) {
    return (
      <PageShell title="Checkout">
        <LoadingState label="Loading cart" />
      </PageShell>
    )
  }

  if (status === 'error' && !cart) {
    return (
      <PageShell title="Checkout">
        <ErrorState
          action={<LinkButton to="/cart">Back to cart</LinkButton>}
          message={error ?? 'Could not load cart.'}
          title="Checkout unavailable"
        />
      </PageShell>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <PageShell title="Checkout">
        <EmptyState
          action={<LinkButton to="/">Shop mice</LinkButton>}
          icon={<CreditCard aria-hidden="true" size={22} />}
          title="Cart required"
        >
          Add at least one product before checkout.
        </EmptyState>
      </PageShell>
    )
  }

  return (
    <PageShell title="Checkout">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <form className="space-y-5" onSubmit={handleSubmit}>
          {submitError ? (
            <ErrorState message={submitError} title="Could not place order" />
          ) : null}
          <Card className="p-5">
            <h2 className="text-lg font-bold text-slate-950">Payment</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Use the simulated payment flow to confirm or fail the order after placement.
            </p>
            <label className="mt-5 block text-sm font-semibold text-slate-800" htmlFor="payment-method">
              Payment method
            </label>
            <select
              className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              disabled={submitting}
              id="payment-method"
              onChange={(event) => setPaymentMethod(event.target.value)}
              value={paymentMethod}
            >
              <option value="simulation">Simulated card payment</option>
            </select>
          </Card>
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={submitting}
              leftIcon={<CreditCard aria-hidden="true" size={18} />}
              size="lg"
              type="submit"
            >
              {submitting ? 'Placing order...' : 'Place order'}
            </Button>
            <LinkButton size="lg" to="/cart" variant="secondary">
              Back to cart
            </LinkButton>
          </div>
        </form>
        <aside>
          <CheckoutSummary cart={cart} />
        </aside>
      </div>
    </PageShell>
  )
}
