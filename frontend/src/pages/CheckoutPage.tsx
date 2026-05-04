import { CreditCard } from 'lucide-react'
import { PageShell } from '../components/layout/PageShell'
import { EmptyState } from '../components/ui/EmptyState'
import { LinkButton } from '../components/ui/LinkButton'

export function CheckoutPage() {
  return (
    <PageShell title="Checkout">
      <EmptyState
        action={<LinkButton to="/cart">Open cart</LinkButton>}
        icon={<CreditCard aria-hidden="true" size={22} />}
        title="Cart required"
      >
        No cart total yet.
      </EmptyState>
    </PageShell>
  )
}
