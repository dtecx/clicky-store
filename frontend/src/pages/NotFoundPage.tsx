import { PageShell } from '../components/layout/PageShell'
import { EmptyState } from '../components/ui/EmptyState'
import { LinkButton } from '../components/ui/LinkButton'

export function NotFoundPage() {
  return (
    <PageShell title="Page not found">
      <EmptyState action={<LinkButton to="/">Back to store</LinkButton>} title="No page here">
        The requested route does not match a Clicky-Store page.
      </EmptyState>
    </PageShell>
  )
}
