import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm'
import { useTranslation } from '@/features/i18n/LocaleContext'

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  return (
    <AuthLayout title={t.resetPassword}>
      <ForgotPasswordForm />
    </AuthLayout>
  )
}
