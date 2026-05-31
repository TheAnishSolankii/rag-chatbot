/**
 * Small reusable UI primitives used throughout the app.
 */
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md', className }) {
  const sizes = { sm: 'w-3 h-3', md: 'w-5 h-5', lg: 'w-8 h-8' }
  return (
    <Loader2 className={clsx(sizes[size] || sizes.md, 'animate-spin text-accent-400', className)} />
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ children, variant = 'default', className }) {
  const variants = {
    default: 'bg-surface text-text-muted border-border',
    accent:  'bg-accent-500/15 text-accent-300 border-accent-500/25',
    success: 'bg-success/15 text-success border-success/25',
    warning: 'bg-warning/15 text-warning border-warning/25',
    error:   'bg-error/15 text-error border-error/25',
    info:    'bg-info/15 text-info border-info/25',
  }
  return (
    <span className={clsx('badge border text-xs font-medium', variants[variant] || variants.default, className)}>
      {children}
    </span>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center animate-fade-in">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center">
          <Icon className="w-7 h-7 text-text-muted" />
        </div>
      )}
      <div>
        {title && <p className="text-text-secondary font-medium">{title}</p>}
        {description && <p className="text-text-muted text-sm mt-1">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider({ label, className }) {
  if (!label) return <hr className={clsx('border-border my-4', className)} />
  return (
    <div className={clsx('flex items-center gap-3 my-4', className)}>
      <div className="flex-1 h-px bg-border" />
      <span className="text-text-muted text-xs">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

// ── KBD ───────────────────────────────────────────────────────────────────────
export function Kbd({ children }) {
  return (
    <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-base-50 text-text-secondary text-xs font-mono">
      {children}
    </kbd>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon: Icon, trend, className }) {
  return (
    <div className={clsx('card px-4 py-3', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-text-muted text-xs font-medium uppercase tracking-widest">{label}</span>
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-accent-400" />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-accent-300">{value}</p>
      {trend !== undefined && (
        <p className={clsx('text-xs mt-1', trend >= 0 ? 'text-success' : 'text-error')}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
        </p>
      )}
    </div>
  )
}
