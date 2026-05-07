import {
  CircleUserRound,
  LogOut,
  MousePointer2,
  Search,
  ShieldCheck,
  ShoppingCart,
} from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/useAuth'
import { useCart } from '../../state/useCart'
import { cn } from '../../utils/cn'

const baseNavItems = [{ label: 'Store', to: '/', end: true }]
const customerNavItems = [{ label: 'Orders', to: '/orders', end: false }]
const adminNavItems = [{ label: 'Admin', to: '/admin', end: false }]

function navLinkClass(isActive: boolean) {
  return cn(
    'rounded-lg px-3 py-2 text-sm font-semibold transition',
    isActive
      ? 'bg-slate-950 text-white'
      : 'text-slate-700 hover:bg-white hover:text-slate-950',
  )
}

export function Header() {
  const { status, user, isAdmin, logout } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()

  const isAuthenticated = status === 'authenticated'

  const navItems = [
    ...baseNavItems,
    ...(isAuthenticated ? customerNavItems : []),
    ...(isAdmin ? adminNavItems : []),
  ]

  function handleLogout() {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-stone-100/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:flex-nowrap lg:px-8">
        <Link
          className="flex min-w-fit items-center gap-2 rounded-lg font-bold text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          to="/"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
            <MousePointer2 aria-hidden="true" size={22} />
          </span>
          <span>Clicky-Store</span>
        </Link>

        <form
          className="order-3 flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-slate-500 sm:order-none sm:min-w-64"
          onSubmit={(event) => {
            event.preventDefault()
            const formData = new FormData(event.currentTarget)
            const query = String(formData.get('q') ?? '').trim()
            navigate(query ? `/?q=${encodeURIComponent(query)}` : '/')
          }}
        >
          <Search aria-hidden="true" size={18} />
          <span className="sr-only">Search products</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
            name="q"
            placeholder="Search mice"
            type="search"
          />
        </form>

        <nav className="flex min-w-fit items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) => navLinkClass(isActive)}
              end={item.end}
              key={item.to}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex min-w-fit items-center gap-2">
          {isAuthenticated ? (
            <>
              <span
                className="hidden h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm sm:inline-flex"
                title={user?.email}
              >
                <CircleUserRound aria-hidden="true" size={18} />
                <span className="max-w-32 truncate">{user?.name ?? 'Account'}</span>
              </span>
              <button
                className="hidden h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-stone-50 sm:inline-flex"
                onClick={handleLogout}
                type="button"
              >
                <LogOut aria-hidden="true" size={18} />
                Logout
              </button>
            </>
          ) : (
            <Link
              className="hidden h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-stone-50 sm:inline-flex"
              to="/login"
            >
              <CircleUserRound aria-hidden="true" size={18} />
              Login
            </Link>
          )}

          {isAdmin ? (
            <Link
              className="hidden h-10 items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 text-sm font-semibold text-sky-900 shadow-sm hover:bg-sky-100 lg:inline-flex"
              to="/admin"
            >
              <ShieldCheck aria-hidden="true" size={18} />
              Admin
            </Link>
          ) : null}

          <Link
            aria-label="Cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-stone-300 bg-white text-slate-900 shadow-sm hover:bg-stone-50"
            to="/cart"
          >
            <ShoppingCart aria-hidden="true" size={19} />
            {itemCount > 0 ? (
              <span className="absolute -right-2 -top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-emerald-700 px-1.5 text-xs font-bold text-white">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
    </header>
  )
}
