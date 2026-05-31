/**
 * useChat — manages conversation state + SSE streaming.
 *
 * Each session is identified by a UUID generated client-side.
 * Streaming tokens are appended to the latest assistant message
 * in real time so the UI can render them as they arrive.
 */
import { useState, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { streamChat } from '../services/api'

const SESSION_KEY = 'rag_session_id'

function getOrCreateSession() {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) { id = uuidv4(); sessionStorage.setItem(SESSION_KEY, id) }
  return id
}

export function useChat() {
  const [messages,   setMessages]   = useState([])   // { id, role, content, sources, ts }
  const [isStreaming, setIsStreaming] = useState(false)
  const [error,      setError]      = useState(null)
  const sessionId = useRef(getOrCreateSession())
  const abortRef  = useRef(false)

  // ── Append / update helpers ────────────────────────────────────────────────
  const addMessage = useCallback((role, content = '', sources = [], id = uuidv4()) => {
    const msg = { id, role, content, sources, ts: new Date() }
    setMessages((prev) => [...prev, msg])
    return id
  }, [])

  const appendToken = useCallback((id, token) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content: m.content + token } : m)),
    )
  }, [])

  const updateMessage = useCallback((id, patch) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }, [])

  // ── Send ──────────────────────────────────────────────────────────────────
  const send = useCallback(async (text) => {
    if (!text.trim() || isStreaming) return

    setError(null)
    abortRef.current = false

    // Add user message immediately
    addMessage('user', text.trim())

    // Add empty assistant placeholder
    const assistantId = uuidv4()
    addMessage('assistant', '', [], assistantId)
    setIsStreaming(true)

    try {
      await streamChat(text.trim(), sessionId.current, {
        onToken: (token) => {
          if (!abortRef.current) appendToken(assistantId, token)
        },
        onSources: (sources) => {
          updateMessage(assistantId, { sources })
        },
        onDone: () => {
          setIsStreaming(false)
        },
        onError: (detail) => {
          setError(detail || 'An error occurred.')
          updateMessage(assistantId, {
            content: '⚠️ Sorry, something went wrong. Please try again.',
          })
          setIsStreaming(false)
        },
      })
    } catch (err) {
      setError(err.message || 'Network error')
      updateMessage(assistantId, {
        content: '⚠️ Network error. Please check your connection.',
      })
      setIsStreaming(false)
    }
  }, [isStreaming, addMessage, appendToken, updateMessage])

  // ── Clear / reset session ─────────────────────────────────────────────────
  const clearChat = useCallback(() => {
    abortRef.current = true
    setMessages([])
    setError(null)
    setIsStreaming(false)
    const newId = uuidv4()
    sessionId.current = newId
    sessionStorage.setItem(SESSION_KEY, newId)
  }, [])

  return {
    messages,
    isStreaming,
    error,
    sessionId: sessionId.current,
    send,
    clearChat,
  }
}
