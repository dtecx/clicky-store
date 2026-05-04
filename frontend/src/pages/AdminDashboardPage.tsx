import { Boxes, ClipboardList, Plus, UsersRound } from 'lucide-react'
import { PageShell } from '../components/layout/PageShell'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { LinkButton } from '../components/ui/LinkButton'

const adminStats = [
  { icon: Boxes, label: 'Products', value: '4' },
  { icon: ClipboardList, label: 'Orders', value: '0' },
  { icon: UsersRound, label: 'Users', value: '1' },
]

export function AdminDashboardPage() {
  return (
    <PageShell
      actions={
        <LinkButton
          leftIcon={<Plus aria-hidden="true" size={18} />}
          to="/admin/products"
        >
          Products
        </LinkButton>
      }
      eyebrow="Admin"
      title="Dashboard"
    >
      <div className="grid gap-5 md:grid-cols-3">
        {adminStats.map((stat) => {
          const Icon = stat.icon

          return (
            <Card className="p-5" key={stat.label}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-600">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-950">
                    {stat.value}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
                  <Icon aria-hidden="true" size={22} />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Card className="p-5">
          <Badge variant="success">Catalog</Badge>
          <h2 className="mt-4 text-xl font-bold text-slate-950">Products</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Four seeded listings across gaming, office, and travel.
          </p>
          <LinkButton className="mt-5" to="/admin/products" variant="secondary">
            Open products
          </LinkButton>
        </Card>
        <Card className="p-5">
          <Badge variant="warning">Orders</Badge>
          <h2 className="mt-4 text-xl font-bold text-slate-950">Payments</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            No pending simulated payments.
          </p>
          <LinkButton className="mt-5" to="/admin/orders" variant="secondary">
            Open orders
          </LinkButton>
        </Card>
        <Card className="p-5">
          <Badge variant="accent">Accounts</Badge>
          <h2 className="mt-4 text-xl font-bold text-slate-950">Users</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            One local administrator account.
          </p>
          <LinkButton className="mt-5" to="/admin/users" variant="secondary">
            Open users
          </LinkButton>
        </Card>
      </div>
    </PageShell>
  )
}
