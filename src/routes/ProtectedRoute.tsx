import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { FullScreenSpinner } from '@/components/common/FullScreenSpinner'
import { pendingJoinPath } from '@/features/expenses/pendingJoin'

/**
 * Redirects to /login unless a session exists. Right after signing in, a
 * pending ledger invite (link opened while signed out) takes priority, so the
 * invitee lands in the shared ledger whichever sign-in flow they used.
 */
export function ProtectedRoute() {
  const { session, isLoading } = useAuth()

  if (isLoading) return <FullScreenSpinner />
  if (!session) return <Navigate to="/login" replace />
  const joinPath = pendingJoinPath()
  if (joinPath) return <Navigate to={joinPath} replace />
  return <Outlet />
}
