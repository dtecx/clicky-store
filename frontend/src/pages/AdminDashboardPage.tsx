import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  Plus,
  ShieldAlert,
  TrendingUp,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  listAdminOrders,
  listAdminProducts,
  listAdminUsers,
} from '../api/admin'
import { PageShell } from '../components/layout/PageShell'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { ErrorState } from '../components/ui/ErrorState'
import { LinkButton } from '../components/ui/LinkButton'
import { LoadingState } from '../components/ui/LoadingState'
import type { Order } from '../types/order'
import type { Product } from '../types/product'
import type { User } from '../types/user'
import { cn } from '../utils/cn'
import { formatDateTime } from '../utils/dates'
import { errorMessage } from '../utils/errors'
import { formatCents } from '../utils/money'

type AdminDashboardData = {
  orders: Order[]
  products: Product[]
  users: User[]
}

type StatTone = 'emerald' | 'sky' | 'violet' | 'amber'

type Stat = {
  caption: string
  href?: string
  icon: LucideIcon
  label: string
  tone: StatTone
  value: string
}

const toneStyles: Record<StatTone, { bg: string; ring: string; text: string }> = {
  emerald: {
    bg: 'bg-emerald-50',
    ring: 'ring-emerald-100',
    text: 'text-emerald-700',
  },
  sky: { bg: 'bg-sky-50', ring: 'ring-sky-100', text: 'text-sky-700' },
  violet: {
    bg: 'bg-violet-50',
    ring: 'ring-violet-100',
    text: 'text-violet-700',
  },
  amber: { bg: 'bg-amber-50', ring: 'ring-amber-100', text: 'text-amber-700' },
}

function paymentBadge(order: Order) {
  if (order.paymentStatus === 'paid') {
    return { label: 'Paid', variant: 'success' as const }
  }
  if (order.paymentStatus === 'failed') {
    return { label: 'Failed', variant: 'danger' as const }
  }
  return { label: 'Pending', variant: 'warning' as const }
}

export function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    Promise.all([listAdminProducts(), listAdminOrders(), listAdminUsers()])
      .then(([products, orders, users]) => {
        if (!cancelled) {
          setData({ products, orders, users })
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setData(null)
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

  const stats: Stat[] = useMemo(() => {
    const orders = data?.orders ?? []
    const products = data?.products ?? []
    const users = data?.users ?? []
    const paidRevenueCents = orders
      .filter((order) => order.paymentStatus === 'paid')
      .reduce((sum, order) => sum + order.totalCents, 0)
    const currency = orders.find((order) => order.paymentStatus === 'paid')?.currency ?? 'PLN'

    return [
      {
        caption: 'Confirmed simulated payments',
        icon: TrendingUp,
        label: 'Revenue',
        tone: 'emerald',
        value: formatCents(paidRevenueCents, currency),
      },
      {
        caption: `${orders.filter((order) => order.paymentStatus === 'pending').length} pending payment`,
        href: '/admin/orders',
        icon: ClipboardList,
        label: 'Orders',
        tone: 'sky',
        value: String(orders.length),
      },
      {
        caption: `${users.filter((user) => user.role === 'admin').length} admins`,
        href: '/admin/users',
        icon: UsersRound,
        label: 'Users',
        tone: 'violet',
        value: String(users.length),
      },
      {
        caption: `${products.filter((product) => product.stock <= 5).length} low / out of stock`,
        href: '/admin/products',
        icon: Boxes,
        label: 'Products',
        tone: 'amber',
        value: String(products.length),
      },
    ]
  }, [data])

  const recentOrders = useMemo(() => (data?.orders ?? []).slice(0, 5), [data])
  const lowStockProducts = useMemo(
    () =>
      [...(data?.products ?? [])]
        .filter((product) => product.stock <= 5)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 5),
    [data],
  )
  const pendingPaymentCount = useMemo(
    () => (data?.orders ?? []).filter((order) => order.paymentStatus === 'pending').length,
    [data],
  )

  if (isLoading && !data) {
    return (
      <PageShell bare eyebrow="Admin" title="Dashboard">
        <LoadingState label="Loading admin dashboard" />
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell bare eyebrow="Admin" title="Dashboard">
        <ErrorState message={error} title="Admin dashboard unavailable" />
      </PageShell>
    )
  }

  return (
    <PageShell
      actions={
        <LinkButton
          leftIcon={<Plus aria-hidden="true" size={18} />}
          to="/admin/products"
        >
          New product
        </LinkButton>
      }
      bare
      description="Snapshot of revenue, orders, users, and the catalog."
      eyebrow="Admin"
      title="Dashboard"
    >
      {pendingPaymentCount > 0 ? (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 ring-1 ring-amber-200">
              <ShieldAlert aria-hidden="true" size={20} />
            </span>
            <div>
              <p className="text-sm font-bold text-amber-900">Action needed</p>
              <p className="mt-1 text-sm text-amber-900/80">
                {pendingPaymentCount}{' '}
                {pendingPaymentCount === 1 ? 'order is' : 'orders are'} waiting on a simulated
                payment decision.
              </p>
            </div>
          </div>
          <LinkButton size="sm" to="/admin/orders" variant="secondary">
            Review orders
          </LinkButton>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          const tone = toneStyles[stat.tone]
          const content = (
            <Card
              className={cn(
                'h-full p-5 transition-all',
                stat.href && 'hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md hover:shadow-stone-400/15',
              )}
              interactive={Boolean(stat.href)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    {stat.label}
                  </p>
                  <p className="mt-2 truncate text-3xl font-bold text-slate-950">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">{stat.caption}</p>
                </div>
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1',
                    tone.bg,
                    tone.text,
                    tone.ring,
                  )}
                >
                  <Icon aria-hidden="true" size={20} />
                </span>
              </div>
            </Card>
          )
          return stat.href ? (
            <Link className="block" key={stat.label} to={stat.href}>
              {content}
            </Link>
          ) : (
            <div key={stat.label}>{content}</div>
          )
        })}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-slate-950">Recent orders</h2>
              <p className="mt-1 text-sm text-slate-600">Latest checkout activity.</p>
            </div>
            <LinkButton size="sm" to="/admin/orders" variant="secondary">
              View all
            </LinkButton>
          </div>
          {recentOrders.length > 0 ? (
            <ul className="divide-y divide-stone-200">
              {recentOrders.map((order) => {
                const badge = paymentBadge(order)
                return (
                  <li
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                    key={order.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">{order.id}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      <p className="min-w-24 text-right font-bold text-slate-950">
                        {formatCents(order.totalCents, order.currency)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="px-5 py-8 text-sm text-slate-600">No orders yet.</div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-slate-950">Low stock</h2>
              <p className="mt-1 text-sm text-slate-600">Five units or fewer.</p>
            </div>
            <LinkButton size="sm" to="/admin/products" variant="secondary">
              Catalog
            </LinkButton>
          </div>
          {lowStockProducts.length > 0 ? (
            <ul className="divide-y divide-stone-200">
              {lowStockProducts.map((product) => (
                <li
                  className="flex items-center justify-between gap-3 px-5 py-4"
                  key={product.id}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">{product.name}</p>
                    <p className="mt-1 text-xs capitalize text-slate-500">{product.category}</p>
                  </div>
                  <Badge variant={product.stock === 0 ? 'danger' : 'warning'}>
                    {product.stock === 0 ? (
                      <>
                        <AlertTriangle aria-hidden="true" size={12} />
                        Out
                      </>
                    ) : (
                      `${product.stock} left`
                    )}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-8 text-sm text-slate-600">Stock levels look healthy.</div>
          )}
        </Card>
      </div>
    </PageShell>
  )
}
