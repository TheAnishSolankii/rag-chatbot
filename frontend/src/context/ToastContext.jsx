/**
 * Toast notification system.
 *
 * Usage anywhere in the app:
 *   const toast = useToast()
 *   toast.success('Document uploaded!')
 *   toast.error('Upload failed.')
 *   toast.info('Processing…')
 *   toast.warning('File is very large.')
 */
import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'
import clsx from 'clsx'

// ── Context ───────────────────────────────────────────────────────────────────
const ToastContext = createContext(null)

const ICONS = {
  success: CheckCircle,
  error:   AlertCircle,
  info:    Info,
  warning: AlertTriangle,
}

const STYLES = {
  success: 'border-success/30 bg-success/10 text-success',
  error:   'border-error/30   bg-error/10   text-error',
  info:    'border-info/30    bg-info/10    text-info',
  warning: 'border-warning/30 bg-warning/10 text-warning',
}

// ── Toast item component ──────────────────────────────────────────────────────
function ToastItem({ id, type, message, onRemove }) {
  const Icon = ICONS[type] || Info

  return (
    <div
      className={clsx(
        'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-card',
        'animate-slide-up backdrop-blur-sm min-w-[280px] max-w-[420px]',
        'bg-surface/95',
        STYLES[type],
      )}
      role="alert"
    >
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm font-medium text-text-primary leading-snug">{message}</p>
      <button
        onClick={() => onRemove(id)}
        className="flex-shrink-0 text-text-muted hover:text-text-primary transition-colors ml-1"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const remove = useCallback((id) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const add = useCallback((type, message, duration = 4000) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev.slice(-4), { id, type, message }]) // max 5 visible
    timers.current[id] = setTimeout(() => remove(id), duration)
    return id
  }, [remove])

  const api = {
    success: (msg, ms)  => add('success', msg, ms),
    error:   (msg, ms)  => add('error',   msg, ms ?? 6000),
    info:    (msg, ms)  => add('info',    msg, ms),
    warning: (msg, ms)  => add('warning', msg, ms),
    dismiss: remove,
  }

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Toast portal — fixed bottom-right */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 items-end pointer-events-none"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem {...t} onRemove={remove} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
