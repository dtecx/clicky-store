import { CreditCard, Lock, ShieldCheck } from 'lucide-react'
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
          icon={<CreditCard aria-hidden="true" size={24} />}
          title="Cart required"
        >
          Add at least one product before checkout.
        </EmptyState>
      </PageShell>
    )
  }

  return (
    <PageShell
      description="Confirm payment to place your order. Educational simulation — no real payment is captured."
      title="Checkout"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start">
        <form className="space-y-5" onSubmit={handleSubmit}>
          {submitError ? (
            <ErrorState message={submitError} title="Could not place order" />
          ) : null}
          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Step 1
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-950">Payment method</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Place the order, then mark the simulated payment as a success or failure on the
              orders page.
            </p>
            <fieldset className="mt-5 space-y-3">
              <legend className="sr-only">Payment method</legend>
              <label
                className="flex cursor-pointer items-start gap-4 rounded-xl border-2 border-emerald-700 bg-emerald-50/50 p-4 transition-colors"
                htmlFor="payment-simulation"
              >
                <input
                  checked={paymentMethod === 'simulation'}
                  className="mt-1 h-4 w-4 accent-emerald-700"
                  disabled={submitting}
                  id="payment-simulation"
                  name="payment"
                  onChange={() => setPaymentMethod('simulation')}
                  type="radio"
                  value="simulation"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-950">
                    <CreditCard aria-hidden="true" size={16} />
                    Simulated card payment
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">
                    Uses the educational simulation flow. No real payment processor is contacted.
                  </span>
                </span>
              </label>
            </fieldset>
          </Card>

          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Step 2
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-950">Place the order</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              By placing the order you create a pending record. Move it to paid or failed from
              the orders screen.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                disabled={submitting}
                leftIcon={<Lock aria-hidden="true" size={18} />}
                size="lg"
                type="submit"
              >
                {submitting ? 'Placing order…' : 'Place order'}
              </Button>
              <LinkButton size="lg" to="/cart" variant="secondary">
                Back to cart
              </LinkButton>
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck aria-hidden="true" size={14} />
              Connection is HTTPS-only in production and your data isn't shared with third parties.
            </p>
          </Card>
        </form>
        <aside className="lg:sticky lg:top-20">
          <CheckoutSummary cart={cart} />
        </aside>
      </div>
    </PageShell>
  )
}
