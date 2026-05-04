import { ShoppingBag } from 'lucide-react'
import { PageShell } from '../components/layout/PageShell'
import { EmptyState } from '../components/ui/EmptyState'
import { LinkButton } from '../components/ui/LinkButton'

export function CartPage() {
  return (
    <PageShell title="Cart">
      <EmptyState
        action={<LinkButton to="/">Continue shopping</LinkButton>}
        icon={<ShoppingBag aria-hidden="true" size={22} />}
        title="Your cart is empty"
      >
        No products selected.
      </EmptyState>
    </PageShell>
  )
}
