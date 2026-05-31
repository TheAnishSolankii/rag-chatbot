import { useRef, useEffect, useCallback } from 'react'
import { SendHorizontal, Square, Loader2 } from 'lucide-react'
import clsx from 'clsx'

const SUGGESTIONS = [
  'Summarise the main findings of this document',
  'What are the key conclusions?',
  'List the most important data points',
  'Explain the methodology used',
]

export default function ChatInput({ onSend, isStreaming, disabled, showSuggestions }) {
  const textareaRef = useRef(null)
  const valueRef    = useRef('')

  // Auto-resize textarea
  const resize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [])

  useEffect(() => { resize() }, [resize])

  const handleInput = (e) => {
    valueRef.current = e.target.value
    resize()
  }

  const submit = useCallback(() => {
    const val = textareaRef.current?.value?.trim()
    if (!val || isStreaming || disabled) return
    onSend(val)
    textareaRef.current.value = ''
    valueRef.current = ''
    resize()
    textareaRef.current?.focus()
  }, [isStreaming, disabled, onSend, resize])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="border-t border-border bg-surface/80 backdrop-blur-sm px-4 py-3 space-y-3">
      {/* Suggestion chips — shown only when chat is empty */}
      {showSuggestions && (
        <div className="flex flex-wrap gap-2 animate-fade-in">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { onSend(s) }}
              className="text-xs px-3 py-1.5 rounded-full border border-border bg-base-50 text-text-secondary hover:border-accent-500/50 hover:text-accent-300 hover:bg-accent-500/10 transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className={clsx(
        'flex items-end gap-2 rounded-xl border bg-base-50 px-3 py-2 transition-colors',
        disabled ? 'opacity-50 cursor-not-allowed border-border' : 'border-border focus-within:border-accent-500/60 focus-within:shadow-glow-sm',
      )}>
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder={disabled ? 'Upload a document to start chatting…' : 'Ask anything about your documents…  (Shift+Enter for newline)'}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled || isStreaming}
          className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted text-sm resize-none outline-none leading-relaxed py-1 min-h-[28px] max-h-40 disabled:cursor-not-allowed"
          style={{ scrollbarWidth: 'none' }}
        />

        <button
          onClick={submit}
          disabled={isStreaming || disabled}
          className={clsx(
            'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all',
            isStreaming
              ? 'bg-error/20 border border-error/30 text-error hover:bg-error/30'
              : 'bg-accent-500 hover:bg-accent-400 text-white shadow-glow-sm hover:shadow-glow disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
          )}
          title={isStreaming ? 'Stop generation' : 'Send message'}
        >
          {isStreaming
            ? <Square className="w-3.5 h-3.5" />
            : <SendHorizontal className="w-4 h-4" />
          }
        </button>
      </div>

      <p className="text-center text-text-muted text-xs">
        AI can make mistakes. Always verify important information.
      </p>
    </div>
  )
}
