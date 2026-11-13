import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { FullScreenSpinner } from '@/components/common/FullScreenSpinner'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthContext'
import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { rememberLedger } from '@/features/expenses/LedgerContext'
import { useJoinLedger } from '@/features/expenses/hooks/useLedgers'
import { clearPendingJoin, savePendingJoin } from '@/features/expenses/pendingJoin'

/**
 * Đích của link mời `/join/<mã>`. Nằm ngoài cả `ProtectedRoute` lẫn
 * `PublicOnlyRoute`: người chưa đăng nhập cần thấy trang này để biết phải đăng
 * nhập, người đã đăng nhập thì vào sổ ngay.
 */
export function JoinLedgerPage() {
  const { code = '' } = useParams()
  const { session, isLoading } = useAuth()
  const { t } = useTranslation()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const joinLedger = useJoinLedger()
  const [failed, setFailed] = useState(false)
  // StrictMode chạy effect hai lần; gọi RPC hai lần thì vô hại nhưng hiện hai toast.
  const started = useRef(false)

  useEffect(() => {
    if (isLoading) return
    if (!session) {
      savePendingJoin(code)
      return
    }
    if (started.current) return
    started.current = true
    clearPendingJoin()
    joinLedger.mutate(code, {
      onSuccess: (ledgerId) => {
        rememberLedger(ledgerId)
        toast.success(t.joinLedgerSuccess)
        navigate('/expenses', { replace: true })
      },
      onError: () => setFailed(true),
    })
  }, [isLoading, session, code, joinLedger, navigate, t])

  if (isLoading) return <FullScreenSpinner />

  if (!session) {
    return (
      <AuthLayout title={t.joinLedgerTitle} subtitle={t.joinLedgerLoginHint}>
        <div className="flex flex-col gap-2.5">
          <Button
            render={<Link to="/login" />}
            nativeButton={false}
            style={{ background: theme.accentFill, color: theme.onAccent }}
          >
            {t.login}
          </Button>
          <Button
            render={<Link to="/signup" />}
            nativeButton={false}
            variant="outline"
            style={{ background: 'transparent', borderColor: theme.border, color: theme.text }}
          >
            {t.signup}
          </Button>
        </div>
      </AuthLayout>
    )
  }

  if (failed) {
    return (
      <AuthLayout title={t.joinLedgerTitle} subtitle={t.joinLedgerInvalid}>
        <Button
          onClick={() => navigate('/expenses', { replace: true })}
          style={{ background: theme.accentFill, color: theme.onAccent }}
          className="w-full"
        >
          {t.joinLedgerGoToExpenses}
        </Button>
      </AuthLayout>
    )
  }

  return <FullScreenSpinner />
}
