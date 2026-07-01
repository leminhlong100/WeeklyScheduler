import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { FullScreenSpinner } from '@/components/common/FullScreenSpinner'

/** Redirects to / if a session already exists (keeps signed-in users off auth pages). */
export function PublicOnlyRoute() {
  const { session, isLoading } = useAuth()

  if (isLoading) return <FullScreenSpinner />
  if (session) return <Navigate to="/" replace />
  return <Outlet />
}
