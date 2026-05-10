import { CheckCircle2, Clock3, ReceiptText, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listOrders, simulateOrderPayment } from '../api/orders'
import { PageShell } from '../components/layout/PageShell'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LinkButton } from '../components/ui/LinkButton'
import { LoadingState } from '../components/ui/LoadingState'
import type { PaymentSimulationResult } from '../types/api'
import type { Order } from '../types/order'
import { formatDateTime } from '../utils/dates'
import { errorMessage } from '../utils/errors'
import { formatCents } from '../utils/money'

type PendingAction = {
  orderId: string
  result: PaymentSimulationResult
}

function statusDetails(order: Order) {
  if (order.paymentStatus === 'paid') {
    return {
      icon: <CheckCircle2 aria-hidden="true" size={16} />,
      label: 'Paid',
      variant: 'success' as const,
    }
  }
  if (order.paymentStatus === 'failed') {
    return {
      icon: <XCircle aria-hidden="true" size={16} />,
      label: 'Payment failed',
      variant: 'danger' as const,
    }
  }
  return {
    icon: <Clock3 aria-hidden="true" size={16} />,
    label: 'Payment pending',
    variant: 'warning' as const,
  }
}

export function OrdersPage() {
  const [searchParams] = useSearchParams()
  const highlightedOrderId = searchParams.get('highlight')
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    listOrders()
      .then((items) => {
        if (!cancelled) {
          setOrders(items)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setOrders([])
          setError(errorMessage(err))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const visibleOrders = useMemo(() => orders ?? [], [orders])

  async function handlePayment(orderId: string, result: PaymentSimulationResult) {
    setPendingAction({ orderId, result })
    setActionError(null)
    try {
      const updated = await simulateOrderPayment(orderId, result)
      setOrders((current) =>
        (current ?? []).map((order) => (order.id === updated.id ? updated : order)),
      )
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setPendingAction(null)
    }
  }

  if (isLoading && orders === null) {
    return (
      <PageShell title="Orders">
        <LoadingState label="Loading orders" />
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell title="Orders">
        <ErrorState
          action={<LinkButton to="/">Shop mice</LinkButton>}
          message={error}
          title="We couldn't load orders"
        />
      </PageShell>
    )
  }

  if (visibleOrders.length === 0) {
    return (
      <PageShell title="Orders">
        <EmptyState
          action={<LinkButton to="/">Shop mice</LinkButton>}
          icon={<ReceiptText aria-hidden="true" size={24} />}
          title="No orders yet"
        >
          Orders placed at checkout will show up here.
        </EmptyState>
      </PageShell>
    )
  }

  return (
    <PageShell
      description={`${visibleOrders.length} ${visibleOrders.length === 1 ? 'order' : 'orders'} placed.`}
      title="Orders"
    >
      <div className="space-y-5">
        {actionError ? (
          <ErrorState message={actionError} title="Payment update failed" />
        ) : null}
        {visibleOrders.map((order) => {
          const details = statusDetails(order)
          const isHighlighted = highlightedOrderId === order.id
          const isPending = order.status === 'pending' && order.paymentStatus === 'pending'
          const successPending =
            pendingAction?.orderId === order.id && pendingAction.result === 'success'
          const failurePending =
            pendingAction?.orderId === order.id && pendingAction.result === 'failure'

          return (
            <Card
              className={
                isHighlighted
                  ? 'border-emerald-400 ring-2 ring-emerald-200/70'
                  : ''
              }
              key={order.id}
            >
              <div className="flex flex-col gap-4 border-b border-stone-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Order
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-950">{order.id}</h2>
                    <Badge variant={details.variant}>
                      <span className="inline-flex">{details.icon}</span>
                      {details.label}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Placed {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Total
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">
                    {formatCents(order.totalCents, order.currency)}
                  </p>
                </div>
              </div>

              <ul className="divide-y divide-stone-200">
                {order.items.map((item) => (
                  <li
                    className="flex items-start justify-between gap-4 px-5 py-4"
                    key={`${order.id}-${item.productId}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Qty {item.quantity} × {formatCents(item.unitPriceCents, order.currency)}
                      </p>
                    </div>
                    <p className="font-bold text-slate-950">
                      {formatCents(item.subtotalCents, order.currency)}
                    </p>
                  </li>
                ))}
              </ul>

              {isPending ? (
                <div className="border-t border-stone-200 bg-amber-50/60 px-5 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold text-amber-900">
                      Simulated payment pending — confirm or fail it below.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={Boolean(pendingAction)}
                        leftIcon={<CheckCircle2 aria-hidden="true" size={16} />}
                        onClick={() => void handlePayment(order.id, 'success')}
                        size="sm"
                        variant="primary"
                      >
                        {successPending ? 'Confirming…' : 'Confirm'}
                      </Button>
                      <Button
                        disabled={Boolean(pendingAction)}
                        leftIcon={<XCircle aria-hidden="true" size={16} />}
                        onClick={() => void handlePayment(order.id, 'failure')}
                        size="sm"
                        variant="secondary"
                      >
                        {failurePending ? 'Failing…' : 'Fail'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </Card>
          )
        })}
      </div>
    </PageShell>
  )
}
