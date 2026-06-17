import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, Bot, FileText, AlertCircle, Download, FileJson } from 'lucide-react'
import { useChat } from '../hooks/useChat'
import { useDocuments } from '../hooks/useDocuments'
import { useChatExport } from '../hooks/useChatExport'
import { useToast } from '../context/ToastContext'
import ChatMessage from '../components/Chat/ChatMessage'
import ChatInput from '../components/Chat/ChatInput'
import Tooltip from '../components/UI/Tooltip'

function EmptyState({ docCount }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-6 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center shadow-glow">
        <Bot className="w-8 h-8 text-accent-400" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-text-primary">Ask your documents anything</h2>
        <p className="text-text-secondary text-sm max-w-sm">
          {docCount > 0
            ? `${docCount} document${docCount > 1 ? 's' : ''} indexed. Type a question below.`
            : 'Upload a PDF document first, then come back here to chat with it.'}
        </p>
      </div>
      {docCount === 0 && (
        <Link to="/documents" className="btn-primary">
          <FileText className="w-4 h-4" /> Upload documents
        </Link>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-muted max-w-md w-full">
        {['📄 Summarise long documents instantly','🔍 Find specific information fast',
          '📊 Extract key data and insights','💬 Ask follow-up questions naturally'].map((f) => (
          <div key={f} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border">{f}</div>
        ))}
      </div>
    </div>
  )
}

export default function ChatPage() {
  const toast = useToast()
  const { messages, isStreaming, error, send, clearChat } = useChat()
  const { documents, fetchDocuments } = useDocuments()
  const { exportMarkdown, exportJSON, hasMessages } = useChatExport(messages)
  const bottomRef = useRef(null)

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isStreaming])

  return (
    <div className="flex flex-col h-full bg-base">
      <header className="flex items-center justify-between px-5 py-3.5 bg-surface border-b border-border flex-shrink-0">
        <div>
          <h1 className="font-semibold text-text-primary text-sm">Document Chat</h1>
          <p className="text-text-muted text-xs mt-0.5">
            {documents.length > 0 ? `${documents.length} document${documents.length > 1 ? 's' : ''} in context` : 'No documents indexed'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {documents.length === 0 && (
            <Link to="/documents" className="btn-ghost text-xs">
              <FileText className="w-3.5 h-3.5" /><span className="hidden sm:inline">Add docs</span>
            </Link>
          )}
          {hasMessages && (
            <>
              <Tooltip content="Export as Markdown" placement="bottom">
                <button onClick={() => { exportMarkdown(); toast.success('Exported as Markdown.') }} className="btn-ghost text-xs p-2">
                  <Download className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
              <Tooltip content="Export as JSON" placement="bottom">
                <button onClick={() => { exportJSON(); toast.success('Exported as JSON.') }} className="btn-ghost text-xs p-2">
                  <FileJson className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
              <Tooltip content="Clear conversation" placement="bottom">
                <button onClick={() => { clearChat(); toast.info('Conversation cleared.') }} className="btn-ghost text-xs p-2 hover:text-error hover:bg-error/10">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </>
          )}
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 mx-4 mt-3 px-3 py-2.5 rounded-lg bg-error/10 border border-error/20 text-error text-sm animate-fade-in flex-shrink-0">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{error}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState docCount={documents.length} />
        ) : (
          <div className="max-w-3xl mx-auto py-4">
            {messages.map((msg, idx) => (
              <ChatMessage key={msg.id} message={msg} isLatest={idx === messages.length - 1} isStreaming={isStreaming} />
            ))}
            <div ref={bottomRef} className="h-4" />
          </div>
        )}
      </div>

      <div className="flex-shrink-0 max-w-3xl w-full mx-auto">
        <ChatInput onSend={send} isStreaming={isStreaming}
          disabled={documents.length === 0} showSuggestions={messages.length === 0 && documents.length > 0} />
      </div>
    </div>
  )
}
