import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { PublicOnlyRoute } from '@/routes/PublicOnlyRoute'
import { FullScreenSpinner } from '@/components/common/FullScreenSpinner'

const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const SignupPage = lazy(() => import('@/pages/SignupPage').then((m) => ({ default: m.SignupPage })))
const ForgotPasswordPage = lazy(() =>
  import('@/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
)
const ResetPasswordPage = lazy(() =>
  import('@/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
)
const SchedulerPage = lazy(() =>
  import('@/pages/SchedulerPage').then((m) => ({ default: m.SchedulerPage })),
)
const DevTestUserMenu = lazy(() =>
  import('@/features/profile/components/UserMenu').then((m) => ({ default: m.UserMenu })),
)

export function AppRouter() {
  return (
    <Suspense fallback={<FullScreenSpinner />}>
      <Routes>
        <Route path="/devtest" element={<DevTestUserMenu />} />
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Supabase's recovery link establishes its own session on arrival, so
            this route is intentionally outside both PublicOnlyRoute and
            ProtectedRoute. */}
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<SchedulerPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
