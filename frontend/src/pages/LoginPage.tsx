import { LogIn } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { PageShell } from '../components/layout/PageShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ErrorState } from '../components/ui/ErrorState'
import { useAuth } from '../state/useAuth'
import { errorMessage } from '../utils/errors'

type LocationState = {
  from?: { pathname?: string; search?: string }
}

export function LoginPage() {
  const { login, status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LocationState | null)?.from
  const redirectTo = from?.pathname ? `${from.pathname}${from.search ?? ''}` : '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status === 'authenticated') {
    return <Navigate replace to={redirectTo} />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) {
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await login({ email: email.trim(), password })
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell title="Login">
      <Card className="mx-auto max-w-md p-6">
        <form className="space-y-5" onSubmit={handleSubmit}>
          {error ? <ErrorState message={error} title="Could not sign in" /> : null}
          <div>
            <label className="text-sm font-semibold text-slate-800" htmlFor="email">
              Email
            </label>
            <input
              autoComplete="email"
              className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              id="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </div>
          <div>
            <label
              className="text-sm font-semibold text-slate-800"
              htmlFor="password"
            >
              Password
            </label>
            <input
              autoComplete="current-password"
              className="mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              id="password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>
          <Button
            className="w-full"
            disabled={submitting}
            leftIcon={<LogIn aria-hidden="true" size={18} />}
            type="submit"
          >
            {submitting ? 'Signing in…' : 'Login'}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-600">
          New customer?{' '}
          <Link className="font-semibold text-emerald-800" to="/register">
            Create an account
          </Link>
        </p>
      </Card>
    </PageShell>
  )
}
