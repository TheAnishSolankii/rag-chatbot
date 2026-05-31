import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

const TOKEN_KEY   = 'rag_access_token'
const REFRESH_KEY = 'rag_refresh_token'
const USER_KEY    = 'rag_user'

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null }
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  // ── Helpers ────────────────────────────────────────────────────────────────
  const saveTokens = (accessToken, refreshToken, userInfo) => {
    localStorage.setItem(TOKEN_KEY,   accessToken)
    localStorage.setItem(REFRESH_KEY, refreshToken)
    localStorage.setItem(USER_KEY,    JSON.stringify(userInfo))
    setUser(userInfo)
  }

  const clearTokens = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  const login = useCallback(async (username, password) => {
    setLoading(true)
    setError(null)
    try {
      const data = await authApi.login(username, password)
      // Fetch user info with the new token
      const userInfo = await authApi.me(data.access_token)
      saveTokens(data.access_token, data.refresh_token, userInfo)
      return { success: true }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Login failed. Please try again.'
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    clearTokens()
  }, [])

  const refreshToken = useCallback(async () => {
    const rt = localStorage.getItem(REFRESH_KEY)
    if (!rt) { clearTokens(); return false }
    try {
      const data = await authApi.refresh(rt)
      localStorage.setItem(TOKEN_KEY, data.access_token)
      localStorage.setItem(REFRESH_KEY, data.refresh_token)
      return true
    } catch {
      clearTokens()
      return false
    }
  }, [])

  // ── Expose getToken for API service ───────────────────────────────────────
  const getToken = useCallback(() => localStorage.getItem(TOKEN_KEY), [])

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, refreshToken, getToken, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
