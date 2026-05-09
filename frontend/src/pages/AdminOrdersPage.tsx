import { CheckCircle2, Clock3, ClipboardList, Search, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { listAdminOrders } from '../api/admin'
import { PageShell } from '../components/layout/PageShell'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import type { Order } from '../types/order'
import { cn } from '../utils/cn'
import { formatDateTime } from '../utils/dates'
import { errorMessage } from '../utils/errors'
import { formatCents } from '../utils/money'

type FilterKey = 'all' | 'pending' | 'paid' | 'failed'

const filters: { label: string; value: FilterKey }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Paid', value: 'paid' },
  { label: 'Failed', value: 'failed' },
]

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

function matchesFilter(order: Order, filter: FilterKey): boolean {
  if (filter === 'all') {
    return true
  }
  if (filter === 'paid') {
    return order.paymentStatus === 'paid'
  }
  if (filter === 'failed') {
    return order.paymentStatus === 'failed'
  }
  return order.paymentStatus === 'pending'
}

function orderText(order: Order): string {
  return [
    order.id,
    order.userId,
    order.status,
    order.paymentStatus,
    order.paymentMethod,
    ...order.items.map((item) => item.name),
  ]
    .join(' ')
    .toLowerCase()
}

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [query, setQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    listAdminOrders()
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

  const counts = useMemo(() => {
    const current = orders ?? []
    return {
      all: current.length,
      failed: current.filter((order) => order.paymentStatus === 'failed').length,
      paid: current.filter((order) => order.paymentStatus === 'paid').length,
      pending: current.filter((order) => order.paymentStatus === 'pending').length,
    }
  }, [orders])

  const visibleOrders = useMemo(() => {
    const needle = query.toLowerCase()
    return (orders ?? []).filter((order) => {
      if (!matchesFilter(order, filter)) {
        return false
      }
      if (!needle) {
        return true
      }
      return orderText(order).includes(needle)
    })
  }, [orders, filter, query])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setQuery(searchInput.trim())
  }

  if (isLoading && !orders) {
    return (
      <PageShell bare eyebrow="Admin" title="Orders">
        <LoadingState label="Loading orders" />
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell bare eyebrow="Admin" title="Orders">
        <ErrorState message={error} title="Orders unavailable" />
      </PageShell>
    )
  }

  return (
    <PageShell
      bare
      description="Track every checkout, simulate payments, and triage failures."
      eyebrow="Admin"
      title="Orders"
    >
      <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm shadow-stone-400/10 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map((entry) => (
            <button
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition-colors',
                filter === entry.value
                  ? 'border-slate-950 bg-slate-950 text-white shadow-sm shadow-slate-900/30'
                  : 'border-stone-300 bg-white text-slate-700 hover:bg-stone-50',
              )}
              key={entry.value}
              onClick={() => setFilter(entry.value)}
              type="button"
            >
              {entry.label}
              <span
                className={cn(
                  'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold',
                  filter === entry.value
                    ? 'bg-white/15 text-white'
                    : 'bg-stone-100 text-slate-600',
                )}
              >
                {counts[entry.value]}
              </span>
            </button>
          ))}
        </div>
        <form className="flex min-w-0 gap-2 sm:w-96" onSubmit={handleSearch}>
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-slate-500 shadow-sm shadow-stone-400/10 focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/15">
            <Search aria-hidden="true" size={18} />
            <span className="sr-only">Search orders</span>
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search orders"
              type="search"
              value={searchInput}
            />
          </label>
          <Button size="sm" type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </div>

      {visibleOrders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList aria-hidden="true" size={24} />}
          title="No orders found"
        >
          Orders that match the current filters will show up here.
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50/60 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Items</th>
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {visibleOrders.map((order) => {
                  const details = statusDetails(order)
                  const itemSummary = order.items
                    .map((item) => `${item.quantity}× ${item.name}`)
                    .join(', ')

                  return (
                    <tr
                      className="transition-colors hover:bg-stone-50/60"
                      key={order.id}
                    >
                      <td className="px-5 py-3">
                        <p className="font-bold text-slate-950">{order.id}</p>
                        <p className="mt-0.5 text-xs capitalize text-slate-500">
                          {order.status.replace('_', ' ')}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="max-w-40 truncate text-slate-700">{order.userId}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="max-w-sm truncate text-slate-700">{itemSummary}</p>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={details.variant}>
                          <span className="inline-flex">{details.icon}</span>
                          {details.label}
                        </Badge>
                        <p className="mt-1 text-xs capitalize text-slate-500">
                          {order.paymentMethod}
                        </p>
                      </td>
                      <td className="px-5 py-3 font-bold text-slate-950">
                        {formatCents(order.totalCents, order.currency)}
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {formatDateTime(order.createdAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageShell>
  )
}
