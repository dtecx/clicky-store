import {
  CircleUserRound,
  LogIn,
  LogOut,
  Menu,
  MousePointer2,
  Search,
  ShieldCheck,
  ShoppingCart,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/useAuth'
import { useCart } from '../../state/useCart'
import { cn } from '../../utils/cn'

const baseNavItems = [{ end: true, label: 'Store', to: '/' }]
const customerNavItems = [{ end: false, label: 'Orders', to: '/orders' }]
const adminNavItems = [{ end: false, label: 'Admin', to: '/admin' }]

function navLinkClass(isActive: boolean) {
  return cn(
    'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
    isActive
      ? 'bg-slate-900 text-white'
      : 'text-slate-700 hover:bg-stone-100 hover:text-slate-900',
  )
}

function mobileNavLinkClass(isActive: boolean) {
  return cn(
    'flex items-center justify-between rounded-lg px-4 py-3 text-base font-semibold transition-colors',
    isActive
      ? 'bg-slate-900 text-white'
      : 'text-slate-800 hover:bg-stone-100',
  )
}

export function Header() {
  const { isAdmin, logout, status, user } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // Subtle border tint once the user starts scrolling.
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 4)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the mobile menu on route change.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname, location.search])

  // Lock body scroll when the drawer is open.
  useEffect(() => {
    if (!menuOpen) {
      return
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [menuOpen])

  const isAuthenticated = status === 'authenticated'

  const navItems = [
    ...baseNavItems,
    ...(isAuthenticated ? customerNavItems : []),
    ...(isAdmin ? adminNavItems : []),
  ]

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const query = String(formData.get('q') ?? '').trim()
    setMenuOpen(false)
    navigate(query ? `/?q=${encodeURIComponent(query)}` : '/')
  }

  function handleLogout() {
    logout()
    setMenuOpen(false)
    navigate('/', { replace: true })
  }

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-30 border-b bg-white/85 backdrop-blur-md transition-colors',
          scrolled ? 'border-stone-200' : 'border-transparent',
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            className="flex shrink-0 items-center gap-2 rounded-lg font-bold text-slate-900"
            to="/"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
              <MousePointer2 aria-hidden="true" size={20} />
            </span>
            <span className="hidden text-base sm:inline lg:text-lg">Clicky-Store</span>
          </Link>

          {/* Inline search — desktop only */}
          <form
            className="hidden h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 text-slate-500 transition-colors focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 lg:flex"
            onSubmit={handleSearchSubmit}
          >
            <Search aria-hidden="true" size={18} />
            <span className="sr-only">Search products</span>
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              name="q"
              placeholder="Search mice, brands…"
              type="search"
            />
          </form>

          {/* Inline nav — desktop only */}
          <nav className="hidden items-center gap-1 lg:flex">
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

          {/* Right cluster */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {/* Account chip — desktop only */}
            {isAuthenticated ? (
              <span
                className="hidden h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold text-slate-800 lg:inline-flex"
                title={user?.email}
              >
                <CircleUserRound aria-hidden="true" size={18} />
                <span className="max-w-32 truncate">{user?.name ?? 'Account'}</span>
              </span>
            ) : (
              <Link
                className="hidden h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-stone-50 lg:inline-flex"
                to="/login"
              >
                <LogIn aria-hidden="true" size={18} />
                Login
              </Link>
            )}

            {isAuthenticated ? (
              <button
                className="hidden h-10 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-stone-50 lg:inline-flex"
                onClick={handleLogout}
                type="button"
              >
                <LogOut aria-hidden="true" size={18} />
                Logout
              </button>
            ) : null}

            {isAdmin ? (
              <Link
                aria-label="Admin dashboard"
                className="hidden h-10 items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 text-sm font-semibold text-sky-900 transition-colors hover:bg-sky-100 lg:inline-flex"
                to="/admin"
              >
                <ShieldCheck aria-hidden="true" size={18} />
                Admin
              </Link>
            ) : null}

            {/* Cart — always visible */}
            <Link
              aria-label={`Cart (${itemCount} items)`}
              className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 bg-white text-slate-800 transition-colors hover:bg-stone-50"
              to="/cart"
            >
              <ShoppingCart aria-hidden="true" size={19} />
              {itemCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-bold text-white ring-2 ring-white">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              ) : null}
            </Link>

            {/* Hamburger — mobile + tablet only */}
            <button
              aria-controls="mobile-nav"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 bg-white text-slate-800 transition-colors hover:bg-stone-50 lg:hidden"
              onClick={() => setMenuOpen((value) => !value)}
              type="button"
            >
              {menuOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div
          aria-label="Mobile menu"
          className="fixed inset-0 z-40 lg:hidden"
          id="mobile-nav"
          role="dialog"
        >
          {/* Backdrop */}
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
            type="button"
          />
          {/* Panel */}
          <div className="absolute inset-x-0 top-0 max-h-[100dvh] overflow-y-auto bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-stone-200 px-4">
              <span className="flex items-center gap-2 text-base font-bold text-slate-900">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <MousePointer2 aria-hidden="true" size={20} />
                </span>
                Clicky-Store
              </span>
              <button
                aria-label="Close menu"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 bg-white text-slate-800 hover:bg-stone-50"
                onClick={() => setMenuOpen(false)}
                type="button"
              >
                <X aria-hidden="true" size={20} />
              </button>
            </div>

            <div className="space-y-6 p-4">
              {/* Search */}
              <form
                className="flex h-11 items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 text-slate-500 focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20"
                onSubmit={handleSearchSubmit}
              >
                <Search aria-hidden="true" size={18} />
                <input
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  name="q"
                  placeholder="Search mice, brands…"
                  type="search"
                />
              </form>

              {/* Nav */}
              <nav aria-label="Primary" className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <NavLink
                    className={({ isActive }) => mobileNavLinkClass(isActive)}
                    end={item.end}
                    key={item.to}
                    to={item.to}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              {/* Account block */}
              <div className="border-t border-stone-200 pt-4">
                {isAuthenticated ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-lg bg-stone-50 px-4 py-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
                        <CircleUserRound aria-hidden="true" size={20} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {user?.name ?? 'Account'}
                        </p>
                        <p className="truncate text-xs text-slate-600">{user?.email}</p>
                      </div>
                    </div>
                    {isAdmin ? (
                      <Link
                        className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900 hover:bg-sky-100"
                        to="/admin"
                      >
                        <ShieldCheck aria-hidden="true" size={18} />
                        Admin dashboard
                      </Link>
                    ) : null}
                    <button
                      className="flex w-full items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-stone-50"
                      onClick={handleLogout}
                      type="button"
                    >
                      <LogOut aria-hidden="true" size={18} />
                      Log out
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Link
                      className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                      to="/login"
                    >
                      <LogIn aria-hidden="true" size={18} />
                      Sign in
                    </Link>
                    <Link
                      className="flex items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-stone-50"
                      to="/register"
                    >
                      Create an account
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
