/**
 * Reusable Modal — accessible, animated, keyboard-aware.
 *
 * Usage:
 *   <Modal open={open} onClose={() => setOpen(false)} title="Confirm">
 *     <p>Are you sure?</p>
 *   </Modal>
 */
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

const SIZE = {
  sm:  'max-w-sm',
  md:  'max-w-md',
  lg:  'max-w-lg',
  xl:  'max-w-xl',
  '2xl': 'max-w-2xl',
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
}) {
  const panelRef  = useRef(null)
  const closeRef  = useRef(null)

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Escape key closes modal
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={clsx(
          'relative w-full card shadow-card-hover animate-slide-up',
          SIZE[size] || SIZE.md,
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-border">
            <div>
              {title && (
                <h2 id="modal-title" className="font-semibold text-text-primary">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-text-secondary text-sm mt-1">{description}</p>
              )}
            </div>
            <button
              ref={closeRef}
              onClick={onClose}
              className="btn-ghost p-1.5 flex-shrink-0 -mt-0.5 -mr-1"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className={clsx('px-5', title || description ? 'py-4' : 'pt-5 pb-4')}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 pb-5 pt-2 border-t border-border flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
