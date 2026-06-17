import { useEffect, useState } from 'react'
import {
  Users, Shield, Activity, Database, Layers,
  Plus, Trash2, RefreshCw, AlertCircle, Loader2,
  ChevronDown, Calendar, User, Eye, EyeOff,
} from 'lucide-react'
import { useAdmin } from '../hooks/useAdmin'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { StatCard, Badge, EmptyState } from '../components/UI/Primitives'
import Modal from '../components/UI/Modal'
import clsx from 'clsx'

// ── Create User Modal ─────────────────────────────────────────────────────────
function CreateUserModal({ open, onClose, onCreate }) {
  const [form, setForm] = useState({ username: '', password: '', email: '', role: 'user' })
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const reset = () => setForm({ username: '', password: '', email: '', role: 'user' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters.'); return }
    setBusy(true)
    const result = await onCreate(form)
    setBusy(false)
    if (result.success) {
      toast.success(`User "${form.username}" created.`)
      reset(); onClose()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create new user" size="sm">
      <form onSubmit={handleSubmit} className="space-y-3">
        {[
          { id: 'username', label: 'Username', type: 'text',  placeholder: 'johndoe' },
          { id: 'email',    label: 'Email (optional)', type: 'email', placeholder: 'john@example.com' },
        ].map(({ id, label, type, placeholder }) => (
          <div key={id} className="space-y-1">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-widest">{label}</label>
            <input
              type={type} placeholder={placeholder}
              value={form[id]}
              onChange={(e) => setForm({ ...form, [id]: e.target.value })}
              className="input" disabled={busy}
              required={id === 'username'}
            />
          </div>
        ))}

        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-widest">Password</label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'} placeholder="Min. 8 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input pr-10" required disabled={busy}
            />
            <button type="button" onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary" tabIndex={-1}>
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-widest">Role</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="input" disabled={busy}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => { reset(); onClose() }} className="btn-ghost flex-1 text-sm" disabled={busy}>Cancel</button>
          <button type="submit" disabled={busy} className="btn-primary flex-1 text-sm justify-center">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {busy ? 'Creating…' : 'Create user'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── User table row ────────────────────────────────────────────────────────────
function UserRow({ u, currentUser, onDelete }) {
  const [deleting, setDeleting] = useState(false)
  const [confirm,  setConfirm]  = useState(false)
  const toast = useToast()
  const isSelf = u.username === currentUser

  const handleDelete = async () => {
    setDeleting(true)
    const r = await onDelete(u.username)
    setDeleting(false)
    setConfirm(false)
    if (r.success) toast.success(`User "${u.username}" deactivated.`)
    else           toast.error(r.error)
  }

  return (
    <>
      <tr className="border-b border-border hover:bg-surface-50 transition-colors group">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-accent-500/20 border border-accent-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-accent-300 text-xs font-bold">{u.username[0].toUpperCase()}</span>
            </div>
            <div>
              <p className="text-text-primary text-sm font-medium">{u.username}</p>
              {u.email && <p className="text-text-muted text-xs">{u.email}</p>}
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge variant={u.role === 'admin' ? 'accent' : 'default'}>
            <Shield className="w-2.5 h-2.5" /> {u.role}
          </Badge>
        </td>
        <td className="px-4 py-3">
          <Badge variant={u.is_active ? 'success' : 'error'}>{u.is_active ? 'Active' : 'Inactive'}</Badge>
        </td>
        <td className="px-4 py-3 text-text-muted text-xs">
          {u.last_login ? new Date(u.last_login).toLocaleDateString() : '—'}
        </td>
        <td className="px-4 py-3 text-right">
          {!isSelf && u.is_active && (
            <button
              onClick={() => setConfirm(true)}
              className="opacity-0 group-hover:opacity-100 btn-danger p-1.5 text-xs transition-all"
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          )}
          {isSelf && <span className="text-text-muted text-xs">you</span>}
        </td>
      </tr>

      <Modal open={confirm} onClose={() => setConfirm(false)} size="sm"
        title="Deactivate user?"
        description={`"${u.username}" will no longer be able to log in.`}
        footer={<>
          <button onClick={() => setConfirm(false)} className="btn-ghost text-sm">Cancel</button>
          <button onClick={handleDelete} disabled={deleting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-error hover:bg-error/80 text-white text-sm font-medium transition-all disabled:opacity-50">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Deactivate
          </button>
        </>}
      />
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user: currentUser } = useAuth()
  const { users, stats, audit, loading, error, fetchStats, fetchUsers, createUser, deleteUser, fetchAuditLog } = useAdmin()
  const [tab,        setTab]        = useState('users')
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => { fetchStats(); fetchUsers(); fetchAuditLog({ limit: 50 }) }, [])

  const TABS = [
    { id: 'users',  label: 'Users',     icon: Users    },
    { id: 'stats',  label: 'System',    icon: Activity },
    { id: 'audit',  label: 'Audit Log', icon: Calendar },
  ]

  return (
    <div className="h-full overflow-y-auto bg-base">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Admin Panel</h1>
            <p className="text-text-muted text-sm mt-0.5">System management and monitoring</p>
          </div>
          <button onClick={() => { fetchStats(); fetchUsers(); fetchAuditLog() }}
            disabled={loading} className="btn-ghost text-sm">
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Users"     value={stats.total_users}     icon={Users}    />
            <StatCard label="Active"    value={stats.active_users}    icon={Shield}   />
            <StatCard label="Documents" value={stats.total_documents} icon={Database} />
            <StatCard label="Vectors"   value={stats.total_vectors.toLocaleString()}   icon={Layers}   />
          </div>
        )}

        <div className="flex gap-1 p-1 bg-surface rounded-xl border border-border w-fit">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                tab === id ? 'bg-accent-500/15 text-accent-300 border border-accent-500/25'
                           : 'text-text-secondary hover:text-text-primary hover:bg-surface-50')}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {tab === 'users' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-text-secondary text-sm">{users.length} total users</p>
              <button onClick={() => setCreateOpen(true)} className="btn-primary text-sm">
                <Plus className="w-4 h-4" /> New user
              </button>
            </div>

            <div className="card overflow-hidden">
              {users.length === 0 ? (
                <EmptyState icon={Users} title="No users" description="Create the first user above." />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-50">
                      {['User', 'Role', 'Status', 'Last login', ''].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <UserRow key={u.id} u={u} currentUser={currentUser?.username} onDelete={deleteUser} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {tab === 'stats' && stats && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: 'Total users',        value: stats.total_users },
              { label: 'Active users',       value: stats.active_users },
              { label: 'Documents indexed',  value: stats.total_documents },
              { label: 'Embedding vectors',  value: stats.total_vectors.toLocaleString() },
              { label: 'Audit events',       value: stats.total_audit_events },
              { label: 'Server time (UTC)',  value: new Date(stats.server_time).toUTCString() },
            ].map(({ label, value }) => (
              <div key={label} className="card px-4 py-3 flex items-center justify-between gap-4">
                <p className="text-text-secondary text-sm">{label}</p>
                <p className="text-text-primary font-semibold font-mono text-sm">{value}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'audit' && (
          <div className="card overflow-hidden">
            {audit.length === 0 ? (
              <EmptyState icon={Calendar} title="No events yet" description="Actions will appear here." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-50">
                    {['User', 'Action', 'Detail', 'Time'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {audit.map((ev) => (
                    <tr key={ev.id} className="border-b border-border hover:bg-surface-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-text-primary text-xs">{ev.username}</td>
                      <td className="px-4 py-3">
                        <Badge variant={ev.action.includes('delete') || ev.action.includes('deactivate') ? 'error' : 'accent'}>
                          {ev.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-text-muted text-xs max-w-xs truncate">{ev.detail || '—'}</td>
                      <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">
                        {new Date(ev.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={createUser} />
    </div>
  )
}
