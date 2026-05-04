import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="font-semibold text-slate-900">Clicky-Store</p>
        <div className="flex flex-wrap gap-4">
          <Link className="hover:text-slate-950" to="/">
            Store
          </Link>
          <Link className="hover:text-slate-950" to="/orders">
            Orders
          </Link>
          <Link className="hover:text-slate-950" to="/admin">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  )
}
