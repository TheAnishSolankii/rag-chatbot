import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import ErrorBoundary from './components/UI/ErrorBoundary'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import AppLayout from './components/UI/AppLayout'
import LoginPage from './pages/LoginPage'
import ChatPage from './pages/ChatPage'
import DocumentsPage from './pages/DocumentsPage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/AdminPage'

function AdminRoute({ children }) {
  const { user, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role !== 'admin') return <Navigate to="/chat" replace />
  return children
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/chat" replace />} />
                <Route path="/chat"      element={<ChatPage />} />
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="/settings"  element={<SettingsPage />} />
                <Route path="/admin"     element={<AdminRoute><AdminPage /></AdminRoute>} />
              </Route>
              <Route path="*" element={<Navigate to="/chat" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
