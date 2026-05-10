import { LogIn, MousePointer2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useAuth } from '../state/useAuth'
import { errorMessage } from '../utils/errors'

type LocationState = {
  from?: { pathname?: string; search?: string }
}

const inputClass =
  'mt-2 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'

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
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <div className="mb-6 text-center">
        <Link
          className="inline-flex items-center gap-2 text-base font-bold text-slate-900"
          to="/"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
            <MousePointer2 aria-hidden="true" size={20} />
          </span>
          Clicky-Store
        </Link>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm shadow-stone-400/10 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-600">
          Welcome back. Enter your details to continue.
        </p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
          {error ? (
            <div
              aria-live="polite"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700"
              role="alert"
            >
              {error}
            </div>
          ) : null}
          <div>
            <label className="text-sm font-semibold text-slate-800" htmlFor="email">
              Email
            </label>
            <input
              autoComplete="email"
              className={inputClass}
              id="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
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
              className={inputClass}
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
            size="lg"
            type="submit"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-6 border-t border-stone-200 pt-5 text-center text-sm text-slate-600">
          New customer?{' '}
          <Link className="font-semibold text-emerald-700 hover:underline" to="/register">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
