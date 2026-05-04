import { UsersRound } from 'lucide-react'
import { PageShell } from '../components/layout/PageShell'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'

const users = [
  {
    email: 'admin@clicky.local',
    name: 'Clicky Admin',
    role: 'admin',
  },
]

export function AdminUsersPage() {
  return (
    <PageShell eyebrow="Admin" title="Users">
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {users.map((user) => (
                <tr key={user.email}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
                        <UsersRound aria-hidden="true" size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-950">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="accent">{user.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="success">Active</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  )
}
