/**
 * Centralised API client.
 * - Attaches Authorization header automatically
 * - Handles 401 → refresh token → retry once
 * - Throws structured errors the UI can display
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor — attach access token ─────────────────────────────
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('rag_access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor — handle 401 / token refresh ────────────────────
let isRefreshing = false
let pendingRequests = []

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({ resolve, reject })
        }).then(() => client(original))
      }
      isRefreshing = true
      try {
        const rt = localStorage.getItem('rag_refresh_token')
        if (!rt) throw new Error('No refresh token')
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: rt })
        localStorage.setItem('rag_access_token',  data.access_token)
        localStorage.setItem('rag_refresh_token', data.refresh_token)
        pendingRequests.forEach(({ resolve }) => resolve())
        pendingRequests = []
        return client(original)
      } catch {
        pendingRequests.forEach(({ reject }) => reject(err))
        pendingRequests = []
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(err)
  },
)

// ═══════════════════════════════════════════════════════════════════════════
//  Auth API
// ═══════════════════════════════════════════════════════════════════════════
export const authApi = {
  login: async (username, password) => {
    const { data } = await client.post('/auth/login', { username, password })
    return data
  },
  refresh: async (refreshToken) => {
    const { data } = await client.post('/auth/refresh', { refresh_token: refreshToken })
    return data
  },
  me: async (token) => {
    const { data } = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  },
}

// ═══════════════════════════════════════════════════════════════════════════
//  Documents API
// ═══════════════════════════════════════════════════════════════════════════
export const documentsApi = {
  list: async () => {
    const { data } = await client.get('/documents/')
    return data
  },
  upload: async (file, onProgress) => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await client.post('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total))
      },
    })
    return data
  },
  delete: async (docId) => {
    const { data } = await client.delete(`/documents/${docId}`)
    return data
  },
}

// ═══════════════════════════════════════════════════════════════════════════
//  Chat API (non-streaming fallback)
// ═══════════════════════════════════════════════════════════════════════════
export const chatApi = {
  message: async (message, sessionId) => {
    const { data } = await client.post('/chat/message', {
      message,
      session_id: sessionId,
      stream: false,
    })
    return data
  },
  history: async (sessionId) => {
    const { data } = await client.get(`/chat/history/${sessionId}`)
    return data
  },
  clearHistory: async (sessionId) => {
    const { data } = await client.delete(`/chat/history/${sessionId}`)
    return data
  },
}

// ── SSE streaming (not through axios — uses native fetch) ─────────────────
export const streamChat = async (message, sessionId, { onToken, onSources, onDone, onError }) => {
  const token = localStorage.getItem('rag_access_token')
  const res = await fetch(`${BASE_URL}/chat/stream`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
      'Accept':        'text/event-stream',
    },
    body: JSON.stringify({ message, session_id: sessionId, stream: true }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    onError?.(body.detail || `HTTP ${res.status}`)
    return
  }

  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let   buffer  = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() // keep incomplete last line

    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const raw = line.slice(5).trim()
      if (!raw || raw === '[DONE]') continue
      try {
        const event = JSON.parse(raw)
        if (event.type === 'token')   onToken?.(event.content)
        if (event.type === 'sources') onSources?.(event.sources)
        if (event.type === 'done')    onDone?.(event.message_id)
        if (event.type === 'error')   onError?.(event.detail)
      } catch { /* skip malformed */ }
    }
  }
}

export default client
