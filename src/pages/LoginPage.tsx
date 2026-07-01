import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { useTranslation } from '@/features/i18n/LocaleContext'

export function LoginPage() {
  const { t } = useTranslation()
  return (
    <AuthLayout title={t.login}>
      <LoginForm />
    </AuthLayout>
  )
}
