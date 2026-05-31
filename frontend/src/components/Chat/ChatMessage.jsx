import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Bot, User, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import SourceCitations from './SourceCitations'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1.5 rounded-md bg-base-100 border border-border text-text-muted hover:text-text-primary transition-all"
      title="Copy code"
    >
      {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
    </button>
  )
}

const mdComponents = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '')
    const code  = String(children).replace(/\n$/, '')
    if (!inline && match) {
      return (
        <div className="relative group my-2">
          <CopyButton text={code} />
          <SyntaxHighlighter
            style={oneDark}
            language={match[1]}
            PreTag="div"
            customStyle={{ margin: 0, borderRadius: '8px', fontSize: '12px', padding: '14px' }}
            {...props}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      )
    }
    return (
      <code className="font-mono text-accent-300 bg-base-100 px-1.5 py-0.5 rounded text-xs" {...props}>
        {children}
      </code>
    )
  },
}

// Blinking cursor rendered while the bot is still streaming
function TypingCursor() {
  return <span className="inline-block w-2 h-4 ml-0.5 bg-accent-400 rounded-sm animate-pulse align-middle" />
}

export default function ChatMessage({ message, isLatest, isStreaming }) {
  const isUser = message.role === 'user'
  const showCursor = isLatest && isStreaming && !isUser

  return (
    <div
      className={clsx(
        'flex gap-3 px-4 py-3 animate-slide-up group',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      {/* Avatar */}
      <div className={clsx(
        'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
        isUser
          ? 'bg-accent-500/20 border border-accent-500/30'
          : 'bg-surface-50 border border-border',
      )}>
        {isUser
          ? <User className="w-4 h-4 text-accent-400" />
          : <Bot  className="w-4 h-4 text-text-secondary" />
        }
      </div>

      {/* Bubble */}
      <div className={clsx('max-w-[82%] space-y-1', isUser ? 'items-end' : 'items-start')}>
        <div className={clsx(
          'rounded-2xl px-4 py-3 text-sm',
          isUser
            ? 'bg-accent-500/20 border border-accent-500/30 text-text-primary rounded-tr-sm'
            : 'bg-surface border border-border text-text-primary rounded-tl-sm',
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <div className="chat-prose">
              {message.content ? (
                <>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                    {message.content}
                  </ReactMarkdown>
                  {showCursor && <TypingCursor />}
                </>
              ) : (
                <div className="flex items-center gap-2 text-text-muted">
                  <span className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </span>
                  <span className="text-xs">Thinking…</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sources */}
        {!isUser && message.sources?.length > 0 && (
          <SourceCitations sources={message.sources} />
        )}

        {/* Timestamp */}
        <p className={clsx(
          'text-xs text-text-muted opacity-0 group-hover:opacity-100 transition-opacity px-1',
          isUser ? 'text-right' : 'text-left',
        )}>
          {message.ts
            ? new Date(message.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : ''}
        </p>
      </div>
    </div>
  )
}
