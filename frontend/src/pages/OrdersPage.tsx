import { ReceiptText } from 'lucide-react'
import { PageShell } from '../components/layout/PageShell'
import { EmptyState } from '../components/ui/EmptyState'
import { LinkButton } from '../components/ui/LinkButton'

export function OrdersPage() {
  return (
    <PageShell title="Orders">
      <EmptyState
        action={<LinkButton to="/">Shop mice</LinkButton>}
        icon={<ReceiptText aria-hidden="true" size={22} />}
        title="No orders yet"
      >
        No order history yet.
      </EmptyState>
    </PageShell>
  )
}
