import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { FullScreenSpinner } from '@/components/common/FullScreenSpinner'

/** Redirects to /login unless a session exists. */
export function ProtectedRoute() {
  const { session, isLoading } = useAuth()

  if (isLoading) return <FullScreenSpinner />
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}
