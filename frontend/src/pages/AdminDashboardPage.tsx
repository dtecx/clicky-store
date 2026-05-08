import { Boxes, ClipboardList, Plus, TrendingUp, UsersRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
import { formatDateTime } from '../utils/dates'
import { errorMessage } from '../utils/errors'
import { formatCents } from '../utils/money'

type AdminDashboardData = {
  orders: Order[]
  products: Product[]
  users: User[]
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

  const stats = useMemo(() => {
    const products = data?.products ?? []
    const orders = data?.orders ?? []
    const users = data?.users ?? []
    const paidRevenueCents = orders
      .filter((order) => order.paymentStatus === 'paid')
      .reduce((sum, order) => sum + order.totalCents, 0)
    const currency = orders.find((order) => order.paymentStatus === 'paid')?.currency ?? 'PLN'

    return [
      {
        icon: Boxes,
        label: 'Products',
        value: String(products.length),
        caption: `${products.filter((product) => product.stock <= 5).length} low stock`,
      },
      {
        icon: ClipboardList,
        label: 'Orders',
        value: String(orders.length),
        caption: `${orders.filter((order) => order.paymentStatus === 'pending').length} pending`,
      },
      {
        icon: UsersRound,
        label: 'Users',
        value: String(users.length),
        caption: `${users.filter((user) => user.role === 'admin').length} admins`,
      },
      {
        icon: TrendingUp,
        label: 'Paid revenue',
        value: formatCents(paidRevenueCents, currency),
        caption: 'Simulated payments',
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

  if (isLoading && !data) {
    return (
      <PageShell eyebrow="Admin" title="Dashboard">
        <LoadingState label="Loading admin dashboard" />
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell eyebrow="Admin" title="Dashboard">
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
      eyebrow="Admin"
      title="Dashboard"
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon

          return (
            <Card className="p-5" key={stat.label}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-600">{stat.label}</p>
                  <p className="mt-2 truncate text-3xl font-bold text-slate-950">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">{stat.caption}</p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
                  <Icon aria-hidden="true" size={22} />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Recent orders</h2>
              <p className="mt-1 text-sm text-slate-600">Latest simulated checkout activity.</p>
            </div>
            <LinkButton size="sm" to="/admin/orders" variant="secondary">
              View all
            </LinkButton>
          </div>
          {recentOrders.length > 0 ? (
            <div className="divide-y divide-stone-200">
              {recentOrders.map((order) => {
                const badge = paymentBadge(order)

                return (
                  <div
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                    key={order.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">{order.id}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      <p className="min-w-24 text-right font-semibold text-slate-950">
                        {formatCents(order.totalCents, order.currency)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-5 py-8 text-sm text-slate-600">No orders yet.</div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Low stock</h2>
              <p className="mt-1 text-sm text-slate-600">Products at five units or fewer.</p>
            </div>
            <LinkButton size="sm" to="/admin/products" variant="secondary">
              Catalog
            </LinkButton>
          </div>
          {lowStockProducts.length > 0 ? (
            <div className="divide-y divide-stone-200">
              {lowStockProducts.map((product) => (
                <div
                  className="flex items-center justify-between gap-3 px-5 py-4"
                  key={product.id}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">{product.name}</p>
                    <p className="mt-1 text-sm capitalize text-slate-600">{product.category}</p>
                  </div>
                  <Badge variant={product.stock === 0 ? 'danger' : 'warning'}>
                    {product.stock === 0 ? 'Out' : `${product.stock} left`}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-sm text-slate-600">Stock levels look healthy.</div>
          )}
        </Card>
      </div>
    </PageShell>
  )
}
