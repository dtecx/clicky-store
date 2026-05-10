import {
  ClipboardList,
  LayoutDashboard,
  Package,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '../../utils/cn'

const navItems: { end?: boolean; icon: LucideIcon; label: string; to: string }[] = [
  { end: true, icon: LayoutDashboard, label: 'Dashboard', to: '/admin' },
  { icon: Package, label: 'Products', to: '/admin/products' },
  { icon: ClipboardList, label: 'Orders', to: '/admin/orders' },
  { icon: UsersRound, label: 'Users', to: '/admin/users' },
]

/**
 * Shared admin shell. Renders a sticky sidebar on desktop and a horizontal
 * pill bar on mobile, then yields its content area to nested routes through
 * `<Outlet />`.
 *
 * Admin pages should NOT wrap their content in their own `<PageShell />`'s
 * outer max-width container. They render directly into the content slot here
 * so the sidebar + content grid stays aligned.
 */
export function AdminLayout() {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-8">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <nav
          aria-label="Admin sections"
          className="rounded-2xl border border-stone-200/80 bg-white p-3 shadow-sm shadow-stone-400/10"
        >
          <div className="hidden items-center gap-2 px-2 pb-3 lg:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
              <ShieldCheck aria-hidden="true" size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Console
              </p>
              <p className="truncate text-sm font-bold text-slate-950">Admin</p>
            </div>
          </div>
          <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <li className="shrink-0 lg:shrink" key={item.to}>
                  <NavLink
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
                        isActive
                          ? 'bg-slate-950 text-white shadow-sm shadow-slate-900/30'
                          : 'text-slate-700 hover:bg-stone-100 hover:text-slate-950',
                      )
                    }
                    end={item.end}
                    to={item.to}
                  >
                    <Icon aria-hidden="true" size={17} />
                    {item.label}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>

      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
