import { MousePointer2 } from 'lucide-react'
import { Link } from 'react-router-dom'

const shopLinks = [
  { label: 'Gaming mice', to: '/?category=gaming' },
  { label: 'Office mice', to: '/?category=office' },
  { label: 'Travel picks', to: '/?category=travel' },
  { label: 'All products', to: '/' },
]

const accountLinks = [
  { label: 'Sign in', to: '/login' },
  { label: 'Create account', to: '/register' },
  { label: 'Your orders', to: '/orders' },
  { label: 'Your cart', to: '/cart' },
]

const supportLinks = [
  { label: 'Shipping & returns', to: '/' },
  { label: 'Warranty', to: '/' },
  { label: 'Contact', to: '/' },
  { label: 'FAQ', to: '/' },
]

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-12 border-t border-stone-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-base font-bold text-slate-950">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
              <MousePointer2 aria-hidden="true" size={20} />
            </span>
            Clicky-Store
          </div>
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

        <FooterColumn title="Support">
          {supportLinks.map((link) => (
            <FooterLink key={link.label} to={link.to}>
              {link.label}
            </FooterLink>
          ))}
        </FooterColumn>
      </div>
      <div className="border-t border-stone-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {year} Clicky-Store · Educational project. Prices in PLN.</p>
          <p>Built with Go, React, Vite, and Tailwind CSS.</p>
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
      <Link className="transition-colors hover:text-slate-950" to={to}>
        {children}
      </Link>
    </li>
  )
}
