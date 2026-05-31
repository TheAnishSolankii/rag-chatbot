import { useState, useCallback } from 'react'
import client from '../services/api'

// ── Admin API ─────────────────────────────────────────────────────────────────
export const adminApi = {
  stats:       async ()               => (await client.get('/admin/stats')).data,
  listUsers:   async ()               => (await client.get('/admin/users')).data,
  createUser:  async (payload)        => (await client.post('/admin/users', payload)).data,
  deleteUser:  async (username)       => (await client.delete(`/admin/users/${username}`)).data,
  auditLog:    async (params = {})    => (await client.get('/admin/audit-log', { params })).data,
}

// ── useAdmin hook ─────────────────────────────────────────────────────────────
export function useAdmin() {
  const [users,   setUsers]   = useState([])
  const [stats,   setStats]   = useState(null)
  const [audit,   setAudit]   = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const fetchStats = useCallback(async () => {
    setLoading(true); setError(null)
    try { setStats(await adminApi.stats()) }
    catch (e) { setError(e.response?.data?.detail || 'Failed to load stats') }
    finally { setLoading(false) }
  }, [])

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError(null)
    try { setUsers(await adminApi.listUsers()) }
    catch (e) { setError(e.response?.data?.detail || 'Failed to load users') }
    finally { setLoading(false) }
  }, [])

  const createUser = useCallback(async (payload) => {
    try {
      const user = await adminApi.createUser(payload)
      setUsers((prev) => [user, ...prev])
      return { success: true, user }
    } catch (e) {
      return { success: false, error: e.response?.data?.detail || 'Failed to create user' }
    }
  }, [])

  const deleteUser = useCallback(async (username) => {
    try {
      await adminApi.deleteUser(username)
      setUsers((prev) => prev.filter((u) => u.username !== username))
      return { success: true }
    } catch (e) {
      return { success: false, error: e.response?.data?.detail || 'Failed to delete user' }
    }
  }, [])

  const fetchAuditLog = useCallback(async (params) => {
    setLoading(true); setError(null)
    try { setAudit(await adminApi.auditLog(params)) }
    catch (e) { setError(e.response?.data?.detail || 'Failed to load audit log') }
    finally { setLoading(false) }
  }, [])

  return {
    users, stats, audit, loading, error,
    fetchStats, fetchUsers, createUser, deleteUser, fetchAuditLog,
  }
}
