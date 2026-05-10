import { Code2, MousePointer2 } from 'lucide-react'
import { Link } from 'react-router-dom'

const shopLinks = [
  { label: 'All products', to: '/' },
  { label: 'Gaming mice', to: '/?category=gaming' },
  { label: 'Office mice', to: '/?category=office' },
]

const accountLinks = [
  { label: 'Sign in', to: '/login' },
  { label: 'Create account', to: '/register' },
  { label: 'Your orders', to: '/orders' },
  { label: 'Your cart', to: '/cart' },
]

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 border-t border-stone-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:grid-cols-3 lg:px-8">
        <div className="space-y-4 sm:col-span-3 lg:col-span-1">
          <Link
            className="inline-flex items-center gap-2 text-base font-bold text-slate-900"
            to="/"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
              <MousePointer2 aria-hidden="true" size={20} />
            </span>
            Clicky-Store
          </Link>
          <p className="max-w-sm text-sm leading-6 text-slate-600">
            A focused shop for gaming and office mice. Curated specs, honest stock counts, and a
            simple checkout — exactly what a shop should be.
          </p>
        </div>

        <FooterColumn title="Shop">
          {shopLinks.map((link) => (
            <FooterLink key={link.label} to={link.to}>
              {link.label}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title="Account">
          {accountLinks.map((link) => (
            <FooterLink key={link.label} to={link.to}>
              {link.label}
            </FooterLink>
          ))}
        </FooterColumn>
      </div>
      <div className="border-t border-stone-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {year} Clicky-Store · Educational project · Prices in PLN</p>
          <p className="inline-flex items-center gap-2">
            <Code2 aria-hidden="true" size={14} />
            Built with Go, React, Vite, and Tailwind CSS
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h3>
      <ul className="space-y-2 text-sm text-slate-700">{children}</ul>
    </div>
  )
}

function FooterLink({
  children,
  to,
}: {
  children: React.ReactNode
  to: string
}) {
  return (
    <li>
      <Link className="transition-colors hover:text-slate-900" to={to}>
        {children}
      </Link>
    </li>
  )
}
