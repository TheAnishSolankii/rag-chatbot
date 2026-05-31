import { NavLink, useNavigate } from 'react-router-dom'
import { Bot, MessageSquare, FileText, LogOut, User, ChevronRight, Settings, Shield } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import clsx from 'clsx'

const NAV_BASE = [
  { to: '/chat',      icon: MessageSquare, label: 'Chat'      },
  { to: '/documents', icon: FileText,      label: 'Documents' },
  { to: '/settings',  icon: Settings,      label: 'Settings'  },
]
const NAV_ADMIN = { to: '/admin', icon: Shield, label: 'Admin' }

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const navItems = user?.role === 'admin' ? [...NAV_BASE, NAV_ADMIN] : NAV_BASE

  return (
    <aside className="flex flex-col h-full w-64 bg-surface border-r border-border">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-accent-500/20 border border-accent-500/30 flex items-center justify-center shadow-glow-sm flex-shrink-0">
          <Bot className="w-5 h-5 text-accent-400" />
        </div>
        <div>
          <p className="font-bold text-text-primary text-sm leading-tight">RAG Chatbot</p>
          <p className="text-text-muted text-xs">Document AI</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={onClose}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
              isActive ? 'bg-accent-500/15 text-accent-300 border border-accent-500/20'
                       : 'text-text-secondary hover:text-text-primary hover:bg-surface-50',
            )}>
            {({ isActive }) => (
              <>
                <Icon className={clsx('w-4 h-4 flex-shrink-0',
                  isActive ? 'text-accent-400' : 'text-text-muted group-hover:text-text-secondary')} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight className="w-3 h-3 text-accent-400" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-border space-y-1">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-base-50">
          <div className="w-7 h-7 rounded-full bg-accent-500/20 border border-accent-500/30 flex items-center justify-center flex-shrink-0">
            <User className="w-3.5 h-3.5 text-accent-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-primary text-xs font-medium truncate">{user?.username}</p>
            <p className="text-text-muted text-xs capitalize">{user?.role}</p>
          </div>
        </div>
        <button onClick={() => { logout(); navigate('/login', { replace: true }) }}
          className="btn-ghost w-full justify-start text-sm text-text-secondary hover:text-error hover:bg-error/10">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </aside>
  )
}
