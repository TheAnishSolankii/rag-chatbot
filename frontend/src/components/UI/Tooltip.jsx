/**
 * Lightweight Tooltip that appears on hover / focus.
 *
 * Usage:
 *   <Tooltip content="Delete document">
 *     <button>🗑</button>
 *   </Tooltip>
 */
import { useState, useRef, useEffect } from 'react'
import clsx from 'clsx'

const PLACEMENT = {
  top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full  left-1/2 -translate-x-1/2 mt-2',
  left:   'right-full top-1/2 -translate-y-1/2 mr-2',
  right:  'left-full  top-1/2 -translate-y-1/2 ml-2',
}

export default function Tooltip({ content, placement = 'top', delay = 400, children }) {
  const [visible, setVisible] = useState(false)
  const timer = useRef(null)

  const show = () => { timer.current = setTimeout(() => setVisible(true), delay) }
  const hide = () => { clearTimeout(timer.current); setVisible(false) }

  useEffect(() => () => clearTimeout(timer.current), [])

  if (!content) return children

  return (
    <span className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {visible && (
        <span
          role="tooltip"
          className={clsx(
            'absolute z-50 whitespace-nowrap px-2.5 py-1.5 rounded-lg',
            'bg-base-50 border border-border text-text-primary text-xs shadow-card',
            'pointer-events-none animate-fade-in',
            PLACEMENT[placement],
          )}
        >
          {content}
        </span>
      )}
    </span>
  )
}
