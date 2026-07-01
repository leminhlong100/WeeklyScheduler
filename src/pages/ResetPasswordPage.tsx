import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm'
import { useTranslation } from '@/features/i18n/LocaleContext'

export function ResetPasswordPage() {
  const { t } = useTranslation()
  return (
    <AuthLayout title={t.setNewPassword}>
      <ResetPasswordForm />
    </AuthLayout>
  )
}
