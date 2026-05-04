import { UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageShell } from '../components/layout/PageShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

export function RegisterPage() {
  return (
    <PageShell title="Create account">
      <Card className="mx-auto max-w-md p-6">
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault()
          }}
        >
          <div>
            <label className="text-sm font-semibold text-slate-800" htmlFor="name">
              Name
            </label>
            <input
              autoComplete="name"
              className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              id="name"
              name="name"
              type="text"
            />
          </div>
          <div>
            <label
              className="text-sm font-semibold text-slate-800"
              htmlFor="register-email"
            >
              Email
            </label>
            <input
              autoComplete="email"
              className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              id="register-email"
              name="email"
              type="email"
            />
          </div>
          <div>
            <label
              className="text-sm font-semibold text-slate-800"
              htmlFor="register-password"
            >
              Password
            </label>
            <input
              autoComplete="new-password"
              className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              id="register-password"
              name="password"
              type="password"
            />
          </div>
          <Button
            className="w-full"
            leftIcon={<UserPlus aria-hidden="true" size={18} />}
            type="submit"
          >
            Create account
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-600">
          Already registered?{' '}
          <Link className="font-semibold text-emerald-800" to="/login">
            Login
          </Link>
        </p>
      </Card>
    </PageShell>
  )
}
