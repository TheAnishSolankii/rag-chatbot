import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, Bot, Loader2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [form,    setForm]    = useState({ username: '', password: '' })
  const [show,    setShow]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username.trim() || !form.password) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    setError('')
    const result = await login(form.username.trim(), form.password)
    if (result.success) {
      navigate('/chat', { replace: true })
    } else {
      setError(result.error || 'Invalid credentials.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 bg-base">
      {/* Background glow blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-accent-700/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-accent-500/20 border border-accent-500/30 flex items-center justify-center shadow-glow">
            <Bot className="w-7 h-7 text-accent-400" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">RAG Chatbot</h1>
            <p className="text-text-muted text-sm mt-1">Sign in to your workspace</p>
          </div>
        </div>

        {/* Card */}
        <div className="card p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-error/10 border border-error/20 text-error text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-widest">
                Username
              </label>
              <input
                type="text"
                autoComplete="username"
                placeholder="admin"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="input"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                  tabIndex={-1}
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 text-sm font-semibold mt-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        {/* Demo hint */}
        <p className="text-center text-text-muted text-xs mt-4">
          Demo credentials: <span className="text-text-secondary font-mono">admin / admin123</span>
        </p>
      </div>
    </div>
  )
}
