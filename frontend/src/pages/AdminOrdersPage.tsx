import { ClipboardList } from 'lucide-react'
import { PageShell } from '../components/layout/PageShell'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'

export function AdminOrdersPage() {
  return (
    <PageShell eyebrow="Admin" title="Orders">
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="neutral">All</Badge>
        <Badge variant="warning">Pending</Badge>
        <Badge variant="success">Paid</Badge>
        <Badge variant="danger">Failed</Badge>
      </div>
      <Card className="p-4">
        <EmptyState
          icon={<ClipboardList aria-hidden="true" size={22} />}
          title="No orders"
        >
          The order queue is empty.
        </EmptyState>
      </Card>
    </PageShell>
  )
}
