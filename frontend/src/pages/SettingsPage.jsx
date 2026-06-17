import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { User, Lock, Bell, Shield, Eye, EyeOff, Check, Loader2 } from 'lucide-react'
import clsx from 'clsx'

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ icon: Icon, title, description, children }) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start gap-3 pb-3 border-b border-border">
        <div className="w-9 h-9 rounded-lg bg-accent-500/15 border border-accent-500/25 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-accent-400" />
        </div>
        <div>
          <h2 className="font-semibold text-text-primary text-sm">{title}</h2>
          <p className="text-text-muted text-xs mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

// ── Toggle switch ──────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer group">
      <div>
        <p className="text-text-primary text-sm font-medium">{label}</p>
        {description && <p className="text-text-muted text-xs mt-0.5">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0',
          checked ? 'bg-accent-500 shadow-glow-sm' : 'bg-border',
        )}
      >
        <span className={clsx(
          'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-6' : 'translate-x-1',
        )} />
      </button>
    </label>
  )
}

// ── Change password form ───────────────────────────────────────────────────────
function ChangePasswordForm() {
  const toast = useToast()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.next !== form.confirm) {
      toast.error('New passwords do not match.')
      return
    }
    if (form.next.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }
    setSaving(true)
    await new Promise((r) => setTimeout(r, 1000))
    setSaving(false)
    setForm({ current: '', next: '', confirm: '' })
    toast.success('Password updated successfully.')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {['current', 'next', 'confirm'].map((field) => (
        <div key={field} className="space-y-1">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-widest">
            {field === 'current' ? 'Current password' : field === 'next' ? 'New password' : 'Confirm new password'}
          </label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              placeholder="••••••••"
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              className="input pr-10"
              disabled={saving}
            />
            {field === 'current' && (
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                tabIndex={-1}
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      ))}
      <button type="submit" disabled={saving} className="btn-primary text-sm">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
        {saving ? 'Saving…' : 'Update password'}
      </button>
    </form>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [prefs, setPrefs] = useState({
    streamingEnabled: true,
    showSourcesByDefault: false,
    emailNotifications: false,
    compactMode: false,
  })

  const update = (key) => (val) => {
    setPrefs((p) => ({ ...p, [key]: val }))
    toast.success('Preference saved.')
  }

  return (
    <div className="h-full overflow-y-auto bg-base">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Settings</h1>
          <p className="text-text-muted text-sm mt-0.5">Manage your account and preferences</p>
        </div>

        <Section icon={User} title="Account" description="Your account information">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-accent-500/20 border border-accent-500/30 flex items-center justify-center flex-shrink-0 shadow-glow-sm">
              <span className="text-accent-300 font-bold text-xl">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-text-primary">{user?.username}</p>
              <span className={clsx(
                'badge border text-xs mt-1',
                user?.role === 'admin'
                  ? 'bg-accent-500/15 text-accent-300 border-accent-500/25'
                  : 'bg-surface text-text-muted border-border',
              )}>
                <Shield className="w-2.5 h-2.5" />
                {user?.role}
              </span>
            </div>
          </div>
        </Section>

        <Section icon={Lock} title="Security" description="Update your password">
          <ChangePasswordForm />
        </Section>

        <Section icon={Bell} title="Chat preferences" description="Customise your chat experience">
          <div className="space-y-4">
            <Toggle
              checked={prefs.streamingEnabled}
              onChange={update('streamingEnabled')}
              label="Streaming responses"
              description="See the AI response appear word-by-word in real time"
            />
            <div className="border-t border-border" />
            <Toggle
              checked={prefs.showSourcesByDefault}
              onChange={update('showSourcesByDefault')}
              label="Show citations by default"
              description="Automatically expand source citations after each response"
            />
            <div className="border-t border-border" />
            <Toggle
              checked={prefs.compactMode}
              onChange={update('compactMode')}
              label="Compact mode"
              description="Reduce padding and spacing in the chat interface"
            />
          </div>
        </Section>

        <Section icon={Shield} title="Danger zone" description="Irreversible actions">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-error/5 border border-error/15">
              <div>
                <p className="text-text-primary text-sm font-medium">Clear all conversation history</p>
                <p className="text-text-muted text-xs mt-0.5">Permanently deletes all chat sessions</p>
              </div>
              <button
                onClick={() => toast.warning('This feature is coming soon.')}
                className="btn-danger text-sm flex-shrink-0"
              >
                Clear all
              </button>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
