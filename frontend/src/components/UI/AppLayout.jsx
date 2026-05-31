import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Sidebar from '../UI/Sidebar'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Close drawer on route change (mobile)
  useEffect(() => setSidebarOpen(false), [location.pathname])

  return (
    <div className="flex h-dvh overflow-hidden bg-base">
      {/* ── Desktop sidebar (always visible ≥ lg) ──────────────────────────── */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* ── Mobile drawer backdrop ─────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Mobile drawer ──────────────────────────────────────────────────── */}
      <div
        className={`
          lg:hidden fixed inset-y-0 left-0 z-50 transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* ── Main content area ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-surface border-b border-border flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="btn-ghost p-2 -ml-1"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-text-primary text-sm">RAG Chatbot</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
