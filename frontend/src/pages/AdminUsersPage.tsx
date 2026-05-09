import { Search, ShieldCheck, UserCog, UsersRound } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { listAdminUsers, updateUserRole } from '../api/admin'
import { PageShell } from '../components/layout/PageShell'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { useAuth } from '../state/useAuth'
import type { UserRole } from '../types/api'
import type { User } from '../types/user'
import { cn } from '../utils/cn'
import { formatDateTime } from '../utils/dates'
import { errorMessage } from '../utils/errors'

const fieldClass =
  'h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15'

export function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('')
  const [query, setQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    listAdminUsers({
      role: roleFilter,
      q: query || undefined,
    })
      .then((items) => {
        if (!cancelled) {
          setUsers(items)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setUsers([])
          setError(errorMessage(err))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [roleFilter, query])

  const visibleUsers = useMemo(() => users ?? [], [users])
  const adminCount = useMemo(
    () => (users ?? []).filter((item) => item.role === 'admin').length,
    [users],
  )

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setQuery(searchInput.trim())
  }

  async function handleRoleChange(user: User, role: UserRole) {
    if (role === user.role) {
      return
    }

    if (currentUser?.id === user.id) {
      setActionError('Sign in as another admin to change your own role.')
      return
    }

    const action = role === 'admin' ? 'Promote' : 'Demote'
    if (!window.confirm(`${action} ${user.email} to ${role}?`)) {
      return
    }

    setPendingUserId(user.id)
    setActionError(null)
    setNotice(null)
    try {
      const updated = await updateUserRole(user.id, role)
      setUsers((current) =>
        current
          ? current.map((item) => (item.id === updated.id ? updated : item))
          : current,
      )
      setNotice(`${updated.email} is now ${updated.role}.`)
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setPendingUserId(null)
    }
  }

  if (isLoading && !users) {
    return (
      <PageShell bare eyebrow="Admin" title="Users">
        <LoadingState label="Loading users" />
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell bare eyebrow="Admin" title="Users">
        <ErrorState message={error} title="Users unavailable" />
      </PageShell>
    )
  }

  return (
    <PageShell
      bare
      description="Browse customers and admins, change roles when needed."
      eyebrow="Admin"
      title="Users"
    >
      <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm shadow-stone-400/10 lg:flex-row lg:items-center lg:justify-between">
        <form className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row" onSubmit={handleSearch}>
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-slate-500">
            <Search aria-hidden="true" size={18} />
            <span className="sr-only">Search users</span>
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search users"
              type="search"
              value={searchInput}
            />
          </label>
          <select
            className={fieldClass}
            onChange={(event) => setRoleFilter(event.target.value as UserRole | '')}
            value={roleFilter}
          >
            <option value="">All roles</option>
            <option value="admin">Admins</option>
            <option value="customer">Customers</option>
          </select>
          <div className="flex gap-2">
            <Button size="sm" type="submit" variant="secondary">
              Search
            </Button>
            <Button
              onClick={() => {
                setRoleFilter('')
                setQuery('')
                setSearchInput('')
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              Reset
            </Button>
          </div>
        </form>
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral">{visibleUsers.length} users</Badge>
          <Badge variant="accent">{adminCount} admins</Badge>
        </div>
      </div>

      {notice ? (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {notice}
        </div>
      ) : null}
      {actionError ? (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {actionError}
        </div>
      ) : null}

      {visibleUsers.length === 0 ? (
        <EmptyState icon={<UsersRound aria-hidden="true" size={24} />} title="No users found">
          Users that match the current filters will show up here.
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50/60 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {visibleUsers.map((user) => {
                  const isCurrentUser = currentUser?.id === user.id
                  const isPending = pendingUserId === user.id
                  const isAdmin = user.role === 'admin'

                  return (
                    <tr
                      className="transition-colors hover:bg-stone-50/60"
                      key={user.id}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex h-10 w-10 items-center justify-center rounded-xl ring-1',
                              isAdmin
                                ? 'bg-sky-50 text-sky-700 ring-sky-100'
                                : 'bg-emerald-50 text-emerald-700 ring-emerald-100',
                            )}
                          >
                            {isAdmin ? (
                              <ShieldCheck aria-hidden="true" size={18} />
                            ) : (
                              <UserCog aria-hidden="true" size={18} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-bold text-slate-950">
                                {user.name}
                              </p>
                              {isCurrentUser ? <Badge variant="accent">You</Badge> : null}
                            </div>
                            <p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          className={fieldClass}
                          disabled={isPending || isCurrentUser}
                          onChange={(event) =>
                            void handleRoleChange(user, event.target.value as UserRole)
                          }
                          title={
                            isCurrentUser
                              ? 'Use another admin account to change your own role.'
                              : undefined
                          }
                          value={user.role}
                        >
                          <option value="customer">Customer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={isPending ? 'warning' : 'success'}>
                          {isPending ? 'Updating…' : 'Active'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {formatDateTime(user.createdAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageShell>
  )
}
